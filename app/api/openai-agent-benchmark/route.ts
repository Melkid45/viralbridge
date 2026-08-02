import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 240;

type AgentBenchmarkRequest = {
  url?: unknown;
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
  const modalUrl = process.env.MODAL_OPENAI_AGENT_URL;
  const modalKey = process.env.MODAL_PROXY_TOKEN_ID;
  const modalSecret = process.env.MODAL_PROXY_TOKEN_SECRET;

  if (!modalUrl) return configurationError("MODAL_OPENAI_AGENT_URL");
  if (!modalKey) return configurationError("MODAL_PROXY_TOKEN_ID");
  if (!modalSecret) return configurationError("MODAL_PROXY_TOKEN_SECRET");

  let body: AgentBenchmarkRequest;
  try {
    body = (await request.json()) as AgentBenchmarkRequest;
  } catch {
    return NextResponse.json(
      { ok: false, stage: "next_validation", error: "Body must be valid JSON" },
      { status: 400 },
    );
  }

  if (typeof body.url !== "string") {
    return NextResponse.json(
      {
        ok: false,
        stage: "next_validation",
        error: "URL must be a string",
      },
      { status: 400 },
    );
  }

  try {
    const parsedUrl = new URL(body.url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Only http and https URLs are allowed");
    }
    if (parsedUrl.username || parsedUrl.password) {
      throw new Error("URLs with embedded credentials are not allowed");
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "next_validation",
        error: error instanceof Error ? error.message : "Invalid URL",
      },
      { status: 400 },
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
        url: body.url,
      }),
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(220_000),
    });

    const rawResponse = await response.text();
    let agentPayload: unknown;

    try {
      agentPayload = JSON.parse(rawResponse);
    } catch {
      agentPayload = { raw_response: rawResponse.slice(0, 8_000) };
    }

    return NextResponse.json(
      {
        gateway: {
          request_id: requestId,
          elapsed_ms: Math.round(performance.now() - startedAt),
          modal_status: response.status,
        },
        agent: agentPayload,
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
