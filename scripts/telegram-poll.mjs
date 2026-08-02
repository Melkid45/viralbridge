import { createHmac } from "node:crypto";

const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
const localWebhookUrl =
  process.env.TELEGRAM_LOCAL_WEBHOOK_URL?.trim() ||
  "http://localhost:3000/api/telegram/webhook";

if (!botToken) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN in .env.local");
}

const webhookSecret = createHmac("sha256", botToken)
  .update("viralbridge:telegram-webhook:v1")
  .digest("hex");

let offset = 0;
let stopping = false;

function stop() {
  stopping = true;
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

async function callTelegram(method, payload = {}) {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(35_000),
    },
  );
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(
      `Telegram ${method} failed: ${result.description ?? response.status}`,
    );
  }

  return result.result;
}

async function forwardUpdate(update) {
  const response = await fetch(localWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": webhookSecret,
    },
    body: JSON.stringify(update),
    signal: AbortSignal.timeout(20_000),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `Local webhook failed (${response.status}): ${JSON.stringify(result)}`,
    );
  }

  return result;
}

async function main() {
  const bot = await callTelegram("getMe");
  await callTelegram("deleteWebhook", { drop_pending_updates: false });

  console.log(`Telegram local polling: @${bot.username}`);
  console.log(`Forwarding updates to ${localWebhookUrl}`);
  console.log("Press Ctrl+C to stop.");

  while (!stopping) {
    try {
      const updates = await callTelegram("getUpdates", {
        offset,
        timeout: 25,
        allowed_updates: ["message", "callback_query"],
      });

      for (const update of updates) {
        const result = await forwardUpdate(update);
        offset = update.update_id + 1;
        console.log(
          JSON.stringify({
            update_id: update.update_id,
            result: result.result,
            connection_id: result.connectionId,
          }),
        );
      }
    } catch (error) {
      if (stopping) break;
      console.error(error instanceof Error ? error.message : error);
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }

  console.log("Telegram local polling stopped.");
}

await main();
