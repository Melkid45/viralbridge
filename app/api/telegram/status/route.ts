import { NextRequest, NextResponse } from "next/server";
import { getTelegramConnection } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const connectionId = request.nextUrl.searchParams.get("connection_id");
  if (!connectionId || !/^[a-f0-9]{32}$/.test(connectionId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid connection_id" },
      { status: 400 },
    );
  }

  const connection = getTelegramConnection(connectionId);
  if (!connection) {
    return NextResponse.json(
      { ok: false, error: "Connection not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, connection });
}
