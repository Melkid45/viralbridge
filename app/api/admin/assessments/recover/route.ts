import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
    startBusinessFitAssessment,
    syncBusinessFitAssessmentByApplicationId,
} from '@/lib/onboarding';
import { getPrisma } from '@/lib/prisma';
import { createOpaqueToken, hashSecretToken } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const recoveryRequestSchema = z
    .object({
        applicationId: z.uuid().optional(),
        email: z.email().max(320).transform((value) => value.toLowerCase()).optional(),
        companyName: z.string().trim().min(2).max(160).optional(),
        restart: z.boolean().default(false),
    })
    .refine((value) => value.applicationId || value.email, {
        message: 'applicationId or email is required',
    });

function isAuthorized(request: NextRequest) {
    const expected = process.env.ASSESSMENT_RECOVERY_SECRET?.trim();
    const provided = request.headers.get('x-recovery-secret')?.trim();
    if (!expected || expected.length < 32 || !provided) return false;

    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided);
    return (
        expectedBuffer.length === providedBuffer.length &&
        timingSafeEqual(expectedBuffer, providedBuffer)
    );
}

export async function POST(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = recoveryRequestSchema.safeParse(
        await request.json().catch(() => null),
    );
    if (!parsed.success) {
        return NextResponse.json(
            { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' },
            { status: 400 },
        );
    }

    try {
        const application = parsed.data.applicationId
            ? await getPrisma().application.findUnique({
                  where: { id: parsed.data.applicationId },
              })
            : await getPrisma().application.findFirst({
                  where: {
                      email: parsed.data.email,
                      companyName: parsed.data.companyName,
                      status: 'PENDING',
                  },
                  orderBy: { createdAt: 'desc' },
              });
        if (!application || application.status !== 'PENDING') {
            return NextResponse.json(
                { ok: false, error: 'Pending application not found' },
                { status: 404 },
            );
        }

        const onboardingToken = createOpaqueToken();
        const [rotated, resetNotification] = await getPrisma().$transaction([
            getPrisma().onboardingSession.updateMany({
                where: { applicationId: application.id },
                data: {
                    tokenHash: hashSecretToken(onboardingToken, 'onboarding'),
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000),
                },
            }),
            getPrisma().application.updateMany({
                where: {
                    id: application.id,
                    status: 'PENDING',
                },
                data: {
                    telegramChatId: null,
                    telegramMessageId: null,
                    telegramNotifiedAt: null,
                    telegramDeliveryError: null,
                },
            }),
        ]);
        if (rotated.count !== 1 || resetNotification.count !== 1) {
            return NextResponse.json(
                { ok: false, error: 'Pending onboarding session not found' },
                { status: 404 },
            );
        }

        let state = await syncBusinessFitAssessmentByApplicationId(application.id);
        const refreshed = await getPrisma().application.findUnique({
            where: { id: application.id },
            select: { fitStatus: true },
        });
        let restarted = false;
        const shouldRestart =
            refreshed &&
            (['FAILED', 'QUEUED'].includes(refreshed.fitStatus) ||
                (parsed.data.restart && refreshed.fitStatus === 'NEEDS_INFO'));
        if (shouldRestart) {
            await getPrisma().application.update({
                where: { id: application.id },
                data: {
                    telegramChatId: null,
                    telegramMessageId: null,
                    telegramNotifiedAt: null,
                    telegramDeliveryError: null,
                },
            });
            const restart = await startBusinessFitAssessment(application.id);
            restarted = restart.ok;
            if (!restart.ok) {
                return NextResponse.json(
                    { ok: false, error: 'Could not restart the assessment' },
                    { status: 503 },
                );
            }
            state = await syncBusinessFitAssessmentByApplicationId(application.id);
        }

        return NextResponse.json({
            ok: true,
            applicationId: application.id,
            restarted,
            state,
            onboardingUrl: `/onboarding/${onboardingToken}`,
        });
    } catch {
        return NextResponse.json(
            { ok: false, error: 'Could not recover the assessment' },
            { status: 503 },
        );
    }
}
