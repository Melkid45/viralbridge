import { cookies } from 'next/headers';
import { Prisma } from '@/app/generated/prisma/client';
import { getPrisma } from '@/lib/prisma';
import { createOpaqueToken, hashSecretToken } from '@/lib/security';

export const SESSION_COOKIE_NAME = 'viralbridge_session';
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type SessionDatabase = Pick<Prisma.TransactionClient, 'session'>;

interface SessionMeta {
    ipAddress?: string;
    userAgent?: string;
}

export async function createUserSession(
    database: SessionDatabase,
    userId: string,
    meta: SessionMeta = {},
) {
    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1_000);

    await database.session.create({
        data: {
            userId,
            tokenHash: hashSecretToken(token, 'session'),
            expiresAt,
            ipAddress: meta.ipAddress?.slice(0, 64),
            userAgent: meta.userAgent?.slice(0, 500),
        },
    });

    return { token, expiresAt };
}

export function getSessionCookieOptions(expiresAt: Date) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        expires: expiresAt,
    };
}

export async function getCurrentUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await getPrisma().session.findFirst({
        where: {
            tokenHash: hashSecretToken(token, 'session'),
            expiresAt: { gt: new Date() },
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                },
            },
        },
    });

    return session?.user ?? null;
}
