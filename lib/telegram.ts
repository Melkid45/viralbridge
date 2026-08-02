import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

const CONNECTION_TTL_MS = 10 * 60 * 1_000;
const MAX_PROCESSED_UPDATES = 1_000;

type TelegramAccount = {
  chatId: number;
  userId: number;
  username?: string;
  firstName?: string;
};

type Delivery = {
  messageId: number;
  sentAt: string;
  kind: "test" | "audit";
};

export type TelegramConnection = {
  id: string;
  clientId: string;
  status: "pending" | "connected" | "expired";
  createdAt: string;
  expiresAt: string;
  connectedAt?: string;
  actionConfirmedAt?: string;
  telegram?: TelegramAccount;
  lastDelivery?: Delivery;
};

type TelegramStore = {
  connections: Map<string, TelegramConnection>;
  connectionByChatId: Map<string, string>;
  processedUpdates: Set<number>;
};

type TelegramUser = {
  id: number;
  first_name?: string;
  username?: string;
};

type TelegramChat = {
  id: number;
};

type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: TelegramChat;
  from?: TelegramUser;
};

type TelegramCallbackQuery = {
  id: string;
  data?: string;
  from: TelegramUser;
  message?: TelegramMessage;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

declare global {
  var viralbridgeTelegramStore: TelegramStore | undefined;
}

function getStore(): TelegramStore {
  if (!globalThis.viralbridgeTelegramStore) {
    globalThis.viralbridgeTelegramStore = {
      connections: new Map(),
      connectionByChatId: new Map(),
      processedUpdates: new Set(),
    };
  }

  return globalThis.viralbridgeTelegramStore;
}

function requireTelegramEnv(name: "TELEGRAM_BOT_TOKEN" | "TELEGRAM_BOT_USERNAME") {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getTelegramConfig() {
  const botToken = requireTelegramEnv("TELEGRAM_BOT_TOKEN");
  const botUsername = requireTelegramEnv("TELEGRAM_BOT_USERNAME").replace(
    /^@/,
    "",
  );

  if (!/^[A-Za-z0-9_]{5,32}$/.test(botUsername)) {
    throw new Error("TELEGRAM_BOT_USERNAME has an invalid format");
  }

  const connectSecret = createHmac("sha256", botToken)
    .update("viralbridge:telegram-connect:v1")
    .digest();
  const webhookSecret = createHmac("sha256", botToken)
    .update("viralbridge:telegram-webhook:v1")
    .digest("hex");

  return {
    botToken,
    botUsername,
    connectSecret,
    webhookSecret,
  };
}

function signConnectionId(connectionId: string) {
  const { connectSecret } = getTelegramConfig();
  return createHmac("sha256", connectSecret)
    .update(connectionId)
    .digest()
    .subarray(0, 16)
    .toString("base64url");
}

function createConnectToken(connectionId: string) {
  return `${connectionId}${signConnectionId(connectionId)}`;
}

function parseConnectToken(token: string) {
  if (!/^[a-f0-9]{32}[A-Za-z0-9_-]{22}$/.test(token)) {
    return null;
  }

  const connectionId = token.slice(0, 32);
  const signature = token.slice(32);
  if (
    !connectionId ||
    !signature
  ) {
    return null;
  }

  const expected = Buffer.from(signConnectionId(connectionId));
  const actual = Buffer.from(signature);
  if (
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    return null;
  }

  return connectionId;
}

function expireStaleConnections() {
  const now = Date.now();
  const store = getStore();

  for (const connection of store.connections.values()) {
    if (
      connection.status === "pending" &&
      Date.parse(connection.expiresAt) <= now
    ) {
      connection.status = "expired";
    }
  }
}

export function createTelegramConnection() {
  expireStaleConnections();

  const id = randomUUID().replaceAll("-", "");
  const now = new Date();
  const connection: TelegramConnection = {
    id,
    clientId: randomUUID(),
    status: "pending",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CONNECTION_TTL_MS).toISOString(),
  };

  getStore().connections.set(id, connection);

  const token = createConnectToken(id);
  const { botUsername } = getTelegramConfig();

  return {
    connection: structuredClone(connection),
    telegramUrl: `https://t.me/${botUsername}?start=${token}`,
  };
}

export function getTelegramConnection(connectionId: string) {
  expireStaleConnections();
  const connection = getStore().connections.get(connectionId);
  return connection ? structuredClone(connection) : null;
}

function bindTelegramAccount(
  token: string,
  chat: TelegramChat,
  user: TelegramUser,
) {
  expireStaleConnections();
  const connectionId = parseConnectToken(token);
  if (!connectionId) return { ok: false as const, reason: "invalid_token" };

  const store = getStore();
  const connection = store.connections.get(connectionId);
  if (!connection) return { ok: false as const, reason: "unknown_connection" };
  if (connection.status === "expired") {
    return { ok: false as const, reason: "expired" };
  }

  if (
    connection.status === "connected" &&
    connection.telegram?.chatId !== chat.id
  ) {
    return { ok: false as const, reason: "already_connected" };
  }

  connection.status = "connected";
  connection.connectedAt ??= new Date().toISOString();
  connection.telegram = {
    chatId: chat.id,
    userId: user.id,
    username: user.username,
    firstName: user.first_name,
  };
  store.connectionByChatId.set(String(chat.id), connection.id);

  return {
    ok: true as const,
    connection: structuredClone(connection),
  };
}

async function callTelegramApi<T>(
  method: string,
  payload: Record<string, unknown>,
) {
  const { botToken } = getTelegramConfig();
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );

  const result = (await response.json()) as TelegramApiResponse<T>;
  if (!response.ok || !result.ok) {
    throw new Error(
      `Telegram ${method} failed: ${result.description ?? response.status}`,
    );
  }

  return result.result;
}

async function sendConnectionConfirmed(connection: TelegramConnection) {
  if (!connection.telegram) throw new Error("Telegram account is not connected");

  return callTelegramApi<TelegramMessage>("sendMessage", {
    chat_id: connection.telegram.chatId,
    text:
      "✅ Telegram подключён к ViralBridge.\n\n" +
      "Нажмите кнопку ниже — проверим двустороннее подтверждение.",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Подтвердить подключение",
            callback_data: `confirm:${connection.id}`,
          },
        ],
      ],
    },
  });
}

export async function sendTelegramTestMessage(connectionId: string) {
  const connection = getStore().connections.get(connectionId);
  if (connection?.status !== "connected" || !connection.telegram) {
    throw new Error("Telegram connection is not active");
  }

  const message = await callTelegramApi<TelegramMessage>("sendMessage", {
    chat_id: connection.telegram.chatId,
    text:
      "🧪 Тестовая доставка ViralBridge успешна.\n\n" +
      "Так будут приходить готовые отчёты и запросы action needed.",
  });

  if (!message) throw new Error("Telegram returned an empty sendMessage result");
  connection.lastDelivery = {
    messageId: message.message_id,
    sentAt: new Date().toISOString(),
    kind: "test",
  };

  return structuredClone(connection.lastDelivery);
}

function formatAuditMessage(audit: unknown) {
  if (!audit || typeof audit !== "object" || Array.isArray(audit)) {
    throw new Error("Audit payload must be an object");
  }

  const sourceUrl = Reflect.get(audit, "source_url");
  const score = Reflect.get(audit, "score");
  const findings = Reflect.get(audit, "findings");
  const timings = Reflect.get(audit, "timings");
  const scoreValue =
    score && typeof score === "object" ? Reflect.get(score, "value") : null;
  const scoreMax =
    score && typeof score === "object" ? Reflect.get(score, "max") : null;

  if (
    typeof sourceUrl !== "string" ||
    typeof scoreValue !== "number" ||
    typeof scoreMax !== "number" ||
    !Array.isArray(findings)
  ) {
    throw new Error("Audit payload is missing source_url, score or findings");
  }

  const normalizedFindings = findings
    .filter(
      (finding) =>
        finding &&
        typeof finding === "object" &&
        typeof finding.title === "string" &&
        ["high", "medium", "low"].includes(finding.severity),
    )
    .map((finding) => ({
      title: String(finding.title),
      severity: String(finding.severity),
    }));

  const highCount = normalizedFindings.filter(
    (finding) => finding.severity === "high",
  ).length;
  const mediumCount = normalizedFindings.filter(
    (finding) => finding.severity === "medium",
  ).length;
  const severityIcon: Record<string, string> = {
    high: "🔴",
    medium: "🟠",
    low: "🔵",
  };
  const topFindings = normalizedFindings
    .slice(0, 5)
    .map(
      (finding) =>
        `${severityIcon[finding.severity] ?? "•"} ${finding.title}`,
    );
  const totalModalMs =
    timings && typeof timings === "object"
      ? Reflect.get(timings, "total_modal_ms")
      : null;

  const lines = [
    "📊 SEO-аудит ViralBridge готов",
    "",
    `Страница: ${sourceUrl}`,
    `Score: ${scoreValue}/${scoreMax}`,
    `Проблемы: ${highCount} high, ${mediumCount} medium, ${normalizedFindings.length} всего`,
  ];

  if (topFindings.length > 0) {
    lines.push("", "Главные наблюдения:", ...topFindings);
  }
  if (typeof totalModalMs === "number") {
    lines.push("", `Время аудита: ${(totalModalMs / 1_000).toFixed(2)} сек`);
  }
  lines.push("", "Полный отчёт доступен в ViralBridge.");

  return lines.join("\n").slice(0, 4_000);
}

export async function sendTelegramAuditMessage(
  connectionId: string,
  audit: unknown,
) {
  const connection = getStore().connections.get(connectionId);
  if (connection?.status !== "connected" || !connection.telegram) {
    throw new Error("Telegram connection is not active");
  }

  const message = await callTelegramApi<TelegramMessage>("sendMessage", {
    chat_id: connection.telegram.chatId,
    text: formatAuditMessage(audit),
    disable_web_page_preview: true,
  });

  if (!message) throw new Error("Telegram returned an empty sendMessage result");
  connection.lastDelivery = {
    messageId: message.message_id,
    sentAt: new Date().toISOString(),
    kind: "audit",
  };

  return structuredClone(connection.lastDelivery);
}

async function handleStartMessage(message: TelegramMessage) {
  const text = message.text?.trim() ?? "";
  const match = text.match(/^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_.-]+))?$/);
  const token = match?.[1];

  if (!token || !message.from) {
    await callTelegramApi("sendMessage", {
      chat_id: message.chat.id,
      text: "Откройте Telegram кнопкой «Подключить» внутри ViralBridge.",
    });
    return { handled: true, result: "missing_connect_token" };
  }

  const binding = bindTelegramAccount(token, message.chat, message.from);
  if (!binding.ok) {
    await callTelegramApi("sendMessage", {
      chat_id: message.chat.id,
      text:
        binding.reason === "expired"
          ? "Ссылка подключения истекла. Вернитесь в ViralBridge и создайте новую."
          : "Ссылка подключения недействительна. Вернитесь в ViralBridge и повторите.",
    });
    return { handled: true, result: binding.reason };
  }

  await sendConnectionConfirmed(binding.connection);
  return {
    handled: true,
    result: "connected",
    connectionId: binding.connection.id,
  };
}

async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery) {
  const match = callbackQuery.data?.match(/^confirm:([a-f0-9]{32})$/);
  const connectionId = match?.[1];
  const chatId = callbackQuery.message?.chat.id;

  if (!connectionId || chatId === undefined) {
    await callTelegramApi("answerCallbackQuery", {
      callback_query_id: callbackQuery.id,
      text: "Кнопка больше не актуальна.",
    });
    return { handled: true, result: "invalid_callback" };
  }

  const connection = getStore().connections.get(connectionId);
  if (
    connection?.status !== "connected" ||
    connection.telegram?.chatId !== chatId
  ) {
    await callTelegramApi("answerCallbackQuery", {
      callback_query_id: callbackQuery.id,
      text: "Подключение не найдено.",
      show_alert: true,
    });
    return { handled: true, result: "connection_not_found" };
  }

  connection.actionConfirmedAt = new Date().toISOString();
  await callTelegramApi("answerCallbackQuery", {
    callback_query_id: callbackQuery.id,
    text: "Подключение подтверждено",
  });
  await callTelegramApi("sendMessage", {
    chat_id: chatId,
    text: "👍 Двусторонняя связь работает.",
  });

  return {
    handled: true,
    result: "action_confirmed",
    connectionId,
  };
}

export async function processTelegramUpdate(update: TelegramUpdate) {
  if (!Number.isInteger(update.update_id)) {
    throw new Error("Telegram update_id must be an integer");
  }

  const store = getStore();
  if (store.processedUpdates.has(update.update_id)) {
    return { handled: true, result: "duplicate" };
  }

  let result: {
    handled: boolean;
    result: string;
    connectionId?: string;
  };

  if (update.callback_query) {
    result = await handleCallbackQuery(update.callback_query);
  } else if (update.message?.text?.startsWith("/start")) {
    result = await handleStartMessage(update.message);
  } else {
    result = { handled: false, result: "ignored_update_type" };
  }

  store.processedUpdates.add(update.update_id);
  if (store.processedUpdates.size > MAX_PROCESSED_UPDATES) {
    const oldest = store.processedUpdates.values().next().value;
    if (typeof oldest === "number") store.processedUpdates.delete(oldest);
  }

  return result;
}

export function isValidTelegramWebhookSecret(value: string | null) {
  if (!value) return false;
  const expected = Buffer.from(getTelegramConfig().webhookSecret);
  const actual = Buffer.from(value);
  return (
    expected.length === actual.length && timingSafeEqual(expected, actual)
  );
}
