import { NextResponse } from "next/server";
import { sendWhatsAppHelloTemplate } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const delivery = await sendWhatsAppHelloTemplate();
    return NextResponse.json({ ok: true, delivery });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "whatsapp_send",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
