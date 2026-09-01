import { getPrisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/security';
import { createUserSession } from '@/lib/session';

export async function signInWithPassword(input: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
}) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
        where: { email: input.email.trim().toLowerCase() },
    });

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        return null;
    }

    const session = await createUserSession(prisma, user.id, {
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
    });

    return {
        user: { id: user.id, email: user.email, name: user.name },
        session,
    };
}
