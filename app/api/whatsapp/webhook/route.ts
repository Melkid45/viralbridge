import { NextRequest, NextResponse } from "next/server";
import {
  isValidWhatsAppSignature,
  summarizeWhatsAppWebhook,
  verifyWhatsAppChallenge,
} from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const challenge = verifyWhatsAppChallenge(
      request.nextUrl.searchParams.get("hub.mode"),
      request.nextUrl.searchParams.get("hub.verify_token"),
      request.nextUrl.searchParams.get("hub.challenge"),
    );

    if (!challenge) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return new NextResponse(challenge, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "whatsapp_configuration",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  try {
    if (
      !isValidWhatsAppSignature(
        rawBody,
        request.headers.get("x-hub-signature-256"),
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid WhatsApp webhook signature" },
        { status: 401 },
      );
    }

    const payload = JSON.parse(rawBody) as unknown;
    const summary = summarizeWhatsAppWebhook(payload);
    console.log(JSON.stringify({ event: "whatsapp_webhook", ...summary }));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "whatsapp_webhook",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
