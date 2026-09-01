import { NextRequest } from 'next/server';

export function getRequestMeta(request: NextRequest) {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor?.split(',')[0]?.trim();

    return {
        ipAddress,
        userAgent: request.headers.get('user-agent') ?? undefined,
    };
}
