import { NextRequest, NextResponse } from "next/server";
import { sendTelegramTestMessage } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SendTestRequest = {
  connection_id?: unknown;
};

export async function POST(request: NextRequest) {
  let body: SendTestRequest;
  try {
    body = (await request.json()) as SendTestRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body must be valid JSON" },
      { status: 400 },
    );
  }

  if (
    typeof body.connection_id !== "string" ||
    !/^[a-f0-9]{32}$/.test(body.connection_id)
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid connection_id" },
      { status: 400 },
    );
  }

  try {
    const delivery = await sendTelegramTestMessage(body.connection_id);
    return NextResponse.json({ ok: true, delivery });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "telegram_send",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
