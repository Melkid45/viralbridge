import { NextRequest, NextResponse } from 'next/server';
import { OnboardingError, syncBusinessFitAssessment } from '@/lib/onboarding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
    _request: NextRequest,
    context: { params: Promise<{ token: string }> },
) {
    try {
        const { token } = await context.params;
        const state = await syncBusinessFitAssessment(token);
        return NextResponse.json({ ok: true, state });
    } catch (error) {
        const status =
            error instanceof OnboardingError && error.code === 'SESSION_EXPIRED'
                ? 410
                : error instanceof OnboardingError
                  ? 400
                  : 503;
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof OnboardingError
                        ? error.message
                        : 'Could not update the onboarding session.',
            },
            { status },
        );
    }
}
