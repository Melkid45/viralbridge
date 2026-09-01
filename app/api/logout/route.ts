import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import {
    getSessionCookieOptions,
    SESSION_COOKIE_NAME,
} from '@/lib/session';
import { hashSecretToken } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
        await getPrisma().session.deleteMany({
            where: {
                tokenHash: hashSecretToken(token, 'session'),
            },
        });
    }

    const response = NextResponse.redirect(new URL('/login', request.url), 303);
    response.cookies.set(SESSION_COOKIE_NAME, '', {
        ...getSessionCookieOptions(new Date(0)),
        maxAge: 0,
    });

    return response;
}
