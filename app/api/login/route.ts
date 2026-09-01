import { NextRequest, NextResponse } from 'next/server';
import { signInWithPassword } from '@/lib/auth';
import { getRequestMeta } from '@/lib/request-meta';
import {
    getSessionCookieOptions,
    SESSION_COOKIE_NAME,
} from '@/lib/session';
import { loginRequestSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null);
    const parsed = loginRequestSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid login' },
            { status: 400 },
        );
    }

    try {
        const result = await signInWithPassword({
            ...parsed.data,
            ...getRequestMeta(request),
        });
        if (!result) {
            return NextResponse.json(
                { ok: false, error: 'Email or password is incorrect.' },
                { status: 401 },
            );
        }

        const response = NextResponse.json({ ok: true, email: result.user.email });
        response.cookies.set(
            SESSION_COOKIE_NAME,
            result.session.token,
            getSessionCookieOptions(result.session.expiresAt),
        );
        return response;
    } catch {
        return NextResponse.json(
            { ok: false, error: 'Could not sign in.' },
            { status: 500 },
        );
    }
}
