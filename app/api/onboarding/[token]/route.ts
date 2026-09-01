import { NextRequest, NextResponse } from 'next/server';
import {
    answerOnboardingQuestion,
    getOnboardingState,
    OnboardingError,
} from '@/lib/onboarding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function onboardingErrorResponse(error: unknown) {
    if (error instanceof OnboardingError) {
        return NextResponse.json(
            { ok: false, error: error.message },
            { status: error.code === 'SESSION_EXPIRED' ? 410 : 400 },
        );
    }
    return NextResponse.json(
        { ok: false, error: 'Could not load the onboarding session.' },
        { status: 503 },
    );
}

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ token: string }> },
) {
    try {
        const { token } = await context.params;
        return NextResponse.json({ ok: true, state: await getOnboardingState(token) });
    } catch (error) {
        return onboardingErrorResponse(error);
    }
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ token: string }> },
) {
    const body = await request.json().catch(() => null);
    try {
        const { token } = await context.params;
        const state = await answerOnboardingQuestion(token, body?.message);
        return NextResponse.json({ ok: true, state });
    } catch (error) {
        return onboardingErrorResponse(error);
    }
}
