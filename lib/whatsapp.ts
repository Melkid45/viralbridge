import { createHmac, timingSafeEqual } from "node:crypto";

type WhatsAppSendConfig = {
  accessToken: string;
  phoneNumberId: string;
  graphApiVersion: string;
  testRecipient: string;
};

type WhatsAppApiResponse = {
  messaging_product?: string;
  messages?: Array<{ id: string; message_status?: string }>;
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getWhatsAppSendConfig(): WhatsAppSendConfig {
  const graphApiVersion = requireEnv("WHATSAPP_GRAPH_API_VERSION");
  if (!/^v\d+\.\d+$/.test(graphApiVersion)) {
    throw new Error("WHATSAPP_GRAPH_API_VERSION must look like vXX.X");
  }

  const testRecipient = requireEnv("WHATSAPP_TEST_RECIPIENT").replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(testRecipient)) {
    throw new Error("WHATSAPP_TEST_RECIPIENT must be an international number");
  }

  return {
    accessToken: requireEnv("WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: requireEnv("WHATSAPP_PHONE_NUMBER_ID"),
    graphApiVersion,
    testRecipient,
  };
}

export async function sendWhatsAppHelloTemplate() {
  const config = getWhatsAppSendConfig();
  const response = await fetch(
    `https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: config.testRecipient,
        type: "template",
        template: {
          name: "hello_world",
          language: { code: "en_US" },
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    },
  );

  const result = (await response.json()) as WhatsAppApiResponse;
  if (!response.ok || result.error) {
    throw new Error(
      `WhatsApp send failed: ${result.error?.message ?? response.status}`,
    );
  }

  const messageId = result.messages?.[0]?.id;
  if (!messageId) {
    throw new Error("WhatsApp returned no message id");
  }

  return {
    messageId,
    messageStatus: result.messages?.[0]?.message_status ?? null,
    sentAt: new Date().toISOString(),
  };
}

export function verifyWhatsAppChallenge(
  mode: string | null,
  token: string | null,
  challenge: string | null,
) {
  const verifyToken = requireEnv("WHATSAPP_VERIFY_TOKEN");
  return mode === "subscribe" && token === verifyToken && challenge
    ? challenge
    : null;
}

export function isValidWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
) {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const appSecret = requireEnv("WHATSAPP_APP_SECRET");
  const expected = Buffer.from(
    `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`,
  );
  const actual = Buffer.from(signatureHeader);

  return (
    expected.length === actual.length && timingSafeEqual(expected, actual)
  );
}

export function summarizeWhatsAppWebhook(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("WhatsApp webhook payload must be an object");
  }

  const entries = Reflect.get(payload, "entry");
  const changes = Array.isArray(entries)
    ? entries.flatMap((entry) =>
        Array.isArray(entry?.changes) ? entry.changes : [],
      )
    : [];

  const messages = changes.flatMap((change) =>
    Array.isArray(change?.value?.messages) ? change.value.messages : [],
  );
  const statuses = changes.flatMap((change) =>
    Array.isArray(change?.value?.statuses) ? change.value.statuses : [],
  );

  return {
    entries: Array.isArray(entries) ? entries.length : 0,
    messages: messages.length,
    statuses: statuses.length,
    messageIds: messages
      .map((message) => message?.id)
      .filter((id): id is string => typeof id === "string"),
    statusIds: statuses
      .map((status) => status?.id)
      .filter((id): id is string => typeof id === "string"),
  };
}
