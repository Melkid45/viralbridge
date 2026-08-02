import { NextRequest, NextResponse } from "next/server";
import {
  isValidTelegramWebhookSecret,
  processTelegramUpdate,
  TelegramUpdate,
} from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const webhookSecret = request.headers.get(
    "x-telegram-bot-api-secret-token",
  );
  if (!isValidTelegramWebhookSecret(webhookSecret)) {
    return NextResponse.json(
      { ok: false, error: "Invalid Telegram webhook secret" },
      { status: 401 },
    );
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body must be valid JSON" },
      { status: 400 },
    );
  }

  try {
    const result = await processTelegramUpdate(update);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "telegram_update",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
