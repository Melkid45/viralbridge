import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/app/generated/prisma/client';

declare global {
    var viralbridgePrisma: PrismaClient | undefined;
}

function normalizeConnectionString(connectionString: string) {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get('sslmode');

    if (sslMode && ['prefer', 'require', 'verify-ca'].includes(sslMode)) {
        url.searchParams.set('sslmode', 'verify-full');
    }

    return url.toString();
}

export function getPrisma() {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) {
        throw new Error('Missing required environment variable: DATABASE_URL');
    }

    if (!globalThis.viralbridgePrisma) {
        const connectionString = normalizeConnectionString(databaseUrl);
        const adapter = new PrismaPg({ connectionString });
        globalThis.viralbridgePrisma = new PrismaClient({ adapter });
    }

    return globalThis.viralbridgePrisma;
}
