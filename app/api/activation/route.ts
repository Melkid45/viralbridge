import { NextRequest, NextResponse } from 'next/server';
import { activateAccount, WorkflowError } from '@/lib/application-workflow';
import { getRequestMeta } from '@/lib/request-meta';
import {
    getSessionCookieOptions,
    SESSION_COOKIE_NAME,
} from '@/lib/session';
import { activationRequestSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null);
    const parsed = activationRequestSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' },
            { status: 400 },
        );
    }

    try {
        const result = await activateAccount({
            ...parsed.data,
            ...getRequestMeta(request),
        });
        const response = NextResponse.json({
            ok: true,
            email: result.user.email,
        });
        response.cookies.set(
            SESSION_COOKIE_NAME,
            result.session.token,
            getSessionCookieOptions(result.session.expiresAt),
        );
        return response;
    } catch (error) {
        if (error instanceof WorkflowError) {
            const status =
                error.code === 'INVITE_EXPIRED' || error.code === 'INVITE_USED'
                    ? 410
                    : error.code === 'ACCOUNT_EXISTS'
                      ? 409
                      : 400;
            return NextResponse.json({ ok: false, error: error.message }, { status });
        }

        return NextResponse.json(
            { ok: false, error: 'Could not activate the account.' },
            { status: 500 },
        );
    }
}
