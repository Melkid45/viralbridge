import { NextResponse } from "next/server";
import { createTelegramConnection } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = createTelegramConnection();
    return NextResponse.json({
      ok: true,
      connection: result.connection,
      telegram_url: result.telegramUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "telegram_configuration",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
