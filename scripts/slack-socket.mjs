import slackBolt from "@slack/bolt";

const { App, LogLevel } = slackBolt;

const botToken = process.env.SLACK_BOT_TOKEN?.trim();
const appToken = process.env.SLACK_APP_TOKEN?.trim();

if (!botToken) {
  throw new Error("Missing SLACK_BOT_TOKEN in .env.local");
}
if (!appToken) {
  throw new Error("Missing SLACK_APP_TOKEN in .env.local");
}

const app = new App({
  token: botToken,
  appToken,
  socketMode: true,
  logLevel: LogLevel.INFO,
});

const connectedUsers = new Map();

function connectionBlocks(userId) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `Привет, <@${userId}>! ViralBridge получил ваше сообщение.\n\n` +
          "Нажмите кнопку — проверим двустороннее действие.",
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: "viralbridge_confirm_connection",
          text: {
            type: "plain_text",
            text: "Подтвердить подключение",
          },
          style: "primary",
          value: "confirm",
        },
      ],
    },
  ];
}

app.message(async ({ message, say }) => {
  if (
    (message.channel_type && message.channel_type !== "im") ||
    message.bot_id ||
    message.subtype ||
    !message.user
  ) {
    return;
  }

  connectedUsers.set(message.user, {
    userId: message.user,
    channelId: message.channel,
    connectedAt: new Date().toISOString(),
  });

  await say({
    text: "ViralBridge получил ваше сообщение. Подтвердите подключение.",
    blocks: connectionBlocks(message.user),
  });

  console.log(
    JSON.stringify({
      event: "slack_connected",
      user_id: message.user,
      channel_id: message.channel,
    }),
  );
});

app.event("app_mention", async ({ event, say }) => {
  await say({
    text:
      `Привет, <@${event.user}>! Для устойчивого личного канала ` +
      "откройте Messages приложения ViralBridge Dev и напишите любое сообщение.",
  });
});

app.action("viralbridge_confirm_connection", async ({ ack, body, client }) => {
  await ack();

  const userId = body.user.id;
  const channelId = body.channel?.id;
  if (!channelId) return;

  const connection = connectedUsers.get(userId);
  if (connection) {
    connection.actionConfirmedAt = new Date().toISOString();
  }

  const result = await client.chat.postMessage({
    channel: channelId,
    text:
      "✅ Двусторонняя связь Slack работает.\n\n" +
      "Так ViralBridge сможет присылать отчёты и запросы action needed.",
  });

  console.log(
    JSON.stringify({
      event: "slack_action_confirmed",
      user_id: userId,
      channel_id: channelId,
      message_ts: result.ts,
    }),
  );
});

const auth = await app.client.auth.test();
await app.start();

console.log(`Slack Socket Mode: @${auth.user ?? "viralbridge-dev"}`);
console.log(`Workspace: ${auth.team ?? auth.team_id ?? "unknown"}`);
console.log("Open the app Messages tab and send any message.");
console.log("Press Ctrl+C to stop.");
