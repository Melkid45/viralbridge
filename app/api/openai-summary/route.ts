import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

type OpenAiSummaryRequest = {
  audit?: unknown;
};

function configurationError(name: string) {
  return NextResponse.json(
    {
      ok: false,
      stage: "next_configuration",
      error: `Missing required environment variable: ${name}`,
    },
    { status: 500 },
  );
}

export async function POST(request: NextRequest) {
  const modalUrl = process.env.MODAL_OPENAI_URL;
  const modalKey = process.env.MODAL_PROXY_TOKEN_ID;
  const modalSecret = process.env.MODAL_PROXY_TOKEN_SECRET;

  if (!modalUrl) return configurationError("MODAL_OPENAI_URL");
  if (!modalKey) return configurationError("MODAL_PROXY_TOKEN_ID");
  if (!modalSecret) return configurationError("MODAL_PROXY_TOKEN_SECRET");

  let body: OpenAiSummaryRequest;
  try {
    body = (await request.json()) as OpenAiSummaryRequest;
  } catch {
    return NextResponse.json(
      { ok: false, stage: "next_validation", error: "Body must be valid JSON" },
      { status: 400 },
    );
  }

  if (
    typeof body.audit !== "object" ||
    body.audit === null ||
    Array.isArray(body.audit)
  ) {
    return NextResponse.json(
      {
        ok: false,
        stage: "next_validation",
        error: "audit must be an object",
      },
      { status: 400 },
    );
  }

  const serializedAudit = JSON.stringify(body.audit);
  if (serializedAudit.length > 100_000) {
    return NextResponse.json(
      {
        ok: false,
        stage: "next_validation",
        error: "audit payload must not exceed 100000 characters",
      },
      { status: 413 },
    );
  }

  const requestId = crypto.randomUUID();
  const startedAt = performance.now();

  try {
    const response = await fetch(modalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Modal-Key": modalKey,
        "Modal-Secret": modalSecret,
        "X-Request-Id": requestId,
      },
      body: JSON.stringify({
        request_id: requestId,
        audit: body.audit,
      }),
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(70_000),
    });

    const rawResponse = await response.text();
    let openAiPayload: unknown;

    try {
      openAiPayload = JSON.parse(rawResponse);
    } catch {
      openAiPayload = { raw_response: rawResponse.slice(0, 4_000) };
    }

    return NextResponse.json(
      {
        gateway: {
          request_id: requestId,
          elapsed_ms: Math.round(performance.now() - startedAt),
          modal_status: response.status,
        },
        openai: openAiPayload,
      },
      { status: response.ok ? 200 : response.status },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "next_to_modal",
        request_id: requestId,
        elapsed_ms: Math.round(performance.now() - startedAt),
        error: error instanceof Error ? error.message : "Unknown upstream error",
      },
      { status: 502 },
    );
  }
}
