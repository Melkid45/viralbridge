import { NextRequest, NextResponse } from "next/server";
import { sendTelegramAuditMessage } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SendAuditRequest = {
  connection_id?: unknown;
  audit?: unknown;
};

export async function POST(request: NextRequest) {
  let body: SendAuditRequest;
  try {
    body = (await request.json()) as SendAuditRequest;
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

  if (
    !body.audit ||
    typeof body.audit !== "object" ||
    Array.isArray(body.audit)
  ) {
    return NextResponse.json(
      { ok: false, error: "audit must be an object" },
      { status: 400 },
    );
  }

  if (JSON.stringify(body.audit).length > 100_000) {
    return NextResponse.json(
      { ok: false, error: "audit payload must not exceed 100000 characters" },
      { status: 413 },
    );
  }

  try {
    const delivery = await sendTelegramAuditMessage(
      body.connection_id,
      body.audit,
    );
    return NextResponse.json({ ok: true, delivery });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "telegram_audit_send",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
