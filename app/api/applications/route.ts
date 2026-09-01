import { NextRequest, NextResponse } from 'next/server';
import {
    ApplicationStatus,
    OnboardingMessageRole,
} from '@/app/generated/prisma/client';
import { startBusinessFitAssessment } from '@/lib/onboarding';
import { getPrisma } from '@/lib/prisma';
import { createOpaqueToken, hashSecretToken } from '@/lib/security';
import { applicationRequestSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ONBOARDING_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null);
    const parsed = applicationRequestSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid application' },
            { status: 400 },
        );
    }

    try {
        const prisma = getPrisma();
        const existingUser = await prisma.user.findUnique({
            where: { email: parsed.data.email },
            select: { id: true },
        });
        if (existingUser) {
            return NextResponse.json(
                { ok: false, error: 'An account already exists for this email.' },
                { status: 409 },
            );
        }

        const existingApplication = await prisma.application.findFirst({
            where: {
                email: parsed.data.email,
                status: {
                    in: [ApplicationStatus.PENDING, ApplicationStatus.APPROVED],
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (existingApplication) {
            return NextResponse.json(
                {
                    ok: false,
                    error: 'An active application already exists for this email.',
                },
                { status: 409 },
            );
        }

        const onboardingToken = createOpaqueToken();
        const application = await prisma.application.create({
            data: {
                fullName: parsed.data.name,
                companyName: parsed.data.company,
                email: parsed.data.email,
                phone: parsed.data.phone,
                website: parsed.data.website,
                onboardingSession: {
                    create: {
                        tokenHash: hashSecretToken(onboardingToken, 'onboarding'),
                        expiresAt: new Date(Date.now() + ONBOARDING_TTL_MS),
                        messages: {
                            create: {
                                role: OnboardingMessageRole.ASSISTANT,
                                content: `Thanks, ${parsed.data.name}. We received your application for ${parsed.data.company}. We are reviewing the company now and will send the final decision to ${parsed.data.email}.`,
                            },
                        },
                    },
                },
            },
        });

        const assessment = await startBusinessFitAssessment(application.id);

        return NextResponse.json(
            {
                ok: true,
                applicationId: application.id,
                status: application.status,
                analysisStarted: assessment.ok,
                onboardingUrl: `/onboarding/${onboardingToken}`,
            },
            { status: 201 },
        );
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error && error.message.includes('DATABASE_URL')
                        ? 'Database is not configured yet.'
                        : 'Could not save the application.',
            },
            { status: 503 },
        );
    }
}
