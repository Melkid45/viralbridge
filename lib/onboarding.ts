import 'server-only';

import {
    ApplicationStatus,
    AssessmentRunStatus,
    FitAssessmentStatus,
    FitRecommendation,
    OnboardingMessageRole,
    OnboardingSessionStatus,
    Prisma,
} from '@/app/generated/prisma/client';
import {
    decideBusinessFit,
    pollBusinessFitJob,
    submitBusinessFitJob,
    type BusinessFitAssessment,
    type BusinessFitDecision,
} from '@/lib/business-fit';
import {
    approveApplicationAutomatically,
    rejectApplicationAutomatically,
    WorkflowError,
} from '@/lib/application-workflow';
import { getPrisma } from '@/lib/prisma';
import { hashSecretToken } from '@/lib/security';
import {
    sendAdminApplicationNotification,
    sendAutoApprovedApplicationNotification,
    sendAutoRejectedApplicationNotification,
} from '@/lib/telegram';

const MAX_ANSWER_LENGTH = 2_000;

export class OnboardingError extends Error {
    constructor(
        public readonly code:
            | 'SESSION_INVALID'
            | 'SESSION_EXPIRED'
            | 'ANSWER_NOT_EXPECTED'
            | 'ANSWER_INVALID',
        message: string,
    ) {
        super(message);
        this.name = 'OnboardingError';
    }
}

function toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function onboardingTokenHash(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
        throw new OnboardingError('SESSION_INVALID', 'Onboarding link is invalid');
    }
    return hashSecretToken(token, 'onboarding');
}

async function findSession(token: string) {
    const prisma = getPrisma();
    const session = await prisma.onboardingSession.findUnique({
        where: { tokenHash: onboardingTokenHash(token) },
        include: {
            application: true,
            messages: { orderBy: { createdAt: 'asc' } },
        },
    });

    if (!session || session.status === OnboardingSessionStatus.CLOSED) {
        throw new OnboardingError('SESSION_INVALID', 'Onboarding link is invalid');
    }
    if (session.expiresAt <= new Date()) {
        throw new OnboardingError('SESSION_EXPIRED', 'Onboarding link has expired');
    }

    return session;
}

async function findSessionByApplicationId(applicationId: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(applicationId)) {
        throw new OnboardingError('SESSION_INVALID', 'Application ID is invalid');
    }

    const session = await getPrisma().onboardingSession.findUnique({
        where: { applicationId },
        include: {
            application: true,
            messages: { orderBy: { createdAt: 'asc' } },
        },
    });
    if (!session || session.status === OnboardingSessionStatus.CLOSED) {
        throw new OnboardingError('SESSION_INVALID', 'Onboarding session is unavailable');
    }
    return session;
}

export async function getOnboardingState(token: string) {
    const session = await findSession(token);
    return serializeOnboardingState(session);
}

function serializeOnboardingState(session: Awaited<ReturnType<typeof findSession>>) {
    return {
        companyName: session.application.companyName,
        applicationStatus: session.application.status,
        fitStatus: session.application.fitStatus,
        canAnswer: session.application.fitStatus === FitAssessmentStatus.NEEDS_INFO,
        shouldPoll:
            session.application.fitStatus === FitAssessmentStatus.QUEUED ||
            session.application.fitStatus === FitAssessmentStatus.RUNNING,
        messages: session.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
        })),
    };
}

async function saveTelegramDelivery(
    applicationId: string,
    delivery: { chatId: number; messageId: number },
) {
    await getPrisma().application.update({
        where: { id: applicationId },
        data: {
            telegramChatId: BigInt(delivery.chatId),
            telegramMessageId: BigInt(delivery.messageId),
            telegramNotifiedAt: new Date(),
            telegramDeliveryError: null,
        },
    });
}

async function saveTelegramError(applicationId: string, error: unknown) {
    const message = error instanceof Error ? error.message : 'Telegram delivery failed';
    await getPrisma().application.update({
        where: { id: applicationId },
        data: { telegramDeliveryError: message.slice(0, 1_000) },
    });
}

async function notifyManualReview(applicationId: string, detail: string) {
    const prisma = getPrisma();
    const application = await prisma.application.findUnique({
        where: { id: applicationId },
    });
    if (!application || application.telegramNotifiedAt) return;

    try {
        const delivery = await sendAdminApplicationNotification(application, detail);
        await saveTelegramDelivery(application.id, delivery);
    } catch (error) {
        await saveTelegramError(application.id, error);
    }
}

async function markAssessmentSubmissionFailed(applicationId: string, error: unknown) {
    const prisma = getPrisma();
    const message = error instanceof Error ? error.message : 'Assessment submission failed';
    const application = await prisma.application.update({
        where: { id: applicationId },
        data: {
            fitStatus: FitAssessmentStatus.FAILED,
            assessmentJobId: null,
            assessmentError: message.slice(0, 1_000),
        },
        include: { onboardingSession: true },
    });

    if (application.onboardingSession) {
        await prisma.onboardingMessage.create({
            data: {
                sessionId: application.onboardingSession.id,
                role: OnboardingMessageRole.ASSISTANT,
                content:
                    'The automatic review could not finish. Your application has been sent to our team for manual review.',
            },
        });
    }

    await notifyManualReview(
        applicationId,
        `⚠️ Automatic fit assessment could not start.\nReason: ${message.slice(0, 500)}`,
    );
}

function clarificationContexts(
    messages: Array<{ role: OnboardingMessageRole; content: string }>,
) {
    const contexts: string[] = [];
    let pendingQuestions = '';

    for (const message of messages) {
        if (
            message.role === OnboardingMessageRole.ASSISTANT &&
            message.content.includes('Reply in one message — short answers are enough.')
        ) {
            pendingQuestions = message.content;
            continue;
        }
        if (message.role !== OnboardingMessageRole.USER) continue;

        contexts.push(
            pendingQuestions
                ? `Questions asked:\n${pendingQuestions}\n\nClient answer:\n${message.content}`
                : `Client answer:\n${message.content}`,
        );
        pendingQuestions = '';
    }

    return contexts;
}

export async function startBusinessFitAssessment(applicationId: string) {
    const prisma = getPrisma();
    const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
            onboardingSession: {
                include: {
                    messages: {
                        orderBy: { createdAt: 'asc' },
                    },
                },
            },
        },
    });

    if (!application || !application.onboardingSession) {
        throw new Error('Application is not ready for business fit assessment');
    }

    try {
        const jobId = await submitBusinessFitJob({
            applicationId: application.id,
            companyName: application.companyName,
            website: application.website,
            fullName: application.fullName,
            email: application.email,
            phone: application.phone,
            answers: clarificationContexts(application.onboardingSession.messages),
        });

        await prisma.application.update({
            where: { id: application.id },
            data: {
                fitStatus: FitAssessmentStatus.RUNNING,
                assessmentJobId: jobId,
                assessmentError: null,
            },
        });
        return { ok: true as const, jobId };
    } catch (error) {
        await markAssessmentSubmissionFailed(application.id, error);
        return { ok: false as const, error };
    }
}

function questionMessage(assessment: BusinessFitAssessment) {
    const questions = [...assessment.critical_questions];
    if (assessment.company_match.status !== 'CONFIRMED') {
        const identityQuestion =
            `Is ${assessment.company_profile.name || 'the company we found'} at ` +
            `${assessment.company_profile.website || 'the submitted website'} the business you represent? ` +
            'If not, please send the correct official website and social profile links.';
        questions.unshift(identityQuestion);
    }

    return [
        'I found some public information, but I need a little more context before I can complete the review:',
        '',
        ...questions.slice(0, 3).map((question, index) => `${index + 1}. ${question}`),
        '',
        'Reply in one message — short answers are enough.',
    ].join('\n');
}

async function clarificationRoundCount(applicationId: string) {
    return getPrisma().onboardingMessage.count({
        where: {
            role: OnboardingMessageRole.USER,
            session: { applicationId },
        },
    });
}

function compactText(value: string, maxLength = 420) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length <= maxLength
        ? normalized
        : `${normalized.slice(0, maxLength - 1)}…`;
}

function manualReviewDetail(
    assessment: BusinessFitAssessment,
    decision: BusinessFitDecision,
) {
    const factors = [
        ['Scalability', assessment.factors.scalability],
        ['Regionality', assessment.factors.regionality],
        ['Market opportunity', assessment.factors.market_opportunity],
        ['Business economics', assessment.factors.business_economics],
    ] as const;
    const lines = [
        '🧭 Automatic assessment requires manual review.',
        `Fit score: ${decision.totalScore}/100`,
        `Confidence: ${Math.round(decision.confidence * 100)}%`,
        `Evidence domains: ${decision.evidenceDomains}`,
        '',
        'Factors:',
        ...factors.map(
            ([label, factor]) =>
                `• ${label}: ${factor.score}/25 — ${compactText(factor.rationale, 300)}`,
        ),
        '',
        'Policy reasons:',
        ...decision.reasons.map((reason) => `• ${reason}`),
    ];

    if (assessment.evidence.length > 0) {
        lines.push(
            '',
            'Evidence:',
            ...assessment.evidence
                .slice(0, 4)
                .map((item) => `• ${compactText(item.title, 140)}\n${item.url}`),
        );
    }

    lines.push('', `Summary: ${compactText(assessment.summary, 600)}`);
    return lines.join('\n').slice(0, 2_900);
}

async function persistCompletedAssessment(
    applicationId: string,
    jobId: string,
    result: Awaited<ReturnType<typeof pollBusinessFitJob>> & { state: 'completed' },
) {
    const prisma = getPrisma();
    const existing = await prisma.applicationAssessment.findUnique({
        where: { providerJobId: jobId },
    });
    if (existing) return existing.recommendation;

    const clarificationRounds = await clarificationRoundCount(applicationId);
    const decision = decideBusinessFit(result.result.assessment, { clarificationRounds });
    const fitStatus = {
        AUTO_APPROVE: FitAssessmentStatus.AUTO_APPROVED,
        AUTO_REJECT: FitAssessmentStatus.AUTO_REJECTED,
        NEEDS_INFO: FitAssessmentStatus.NEEDS_INFO,
        MANUAL_REVIEW: FitAssessmentStatus.MANUAL_REVIEW,
    }[decision.recommendation];

    await prisma.$transaction(async (transaction) => {
        const application = await transaction.application.findUnique({
            where: { id: applicationId },
            include: { onboardingSession: true },
        });
        if (!application || application.assessmentJobId !== jobId) return;

        await transaction.applicationAssessment.create({
            data: {
                applicationId,
                providerJobId: jobId,
                runStatus: AssessmentRunStatus.COMPLETED,
                recommendation: decision.recommendation as FitRecommendation,
                totalScore: decision.totalScore,
                confidence: decision.confidence,
                summary: result.result.assessment.summary,
                companyProfile: toJson(result.result.assessment.company_profile),
                factors: toJson(result.result.assessment.factors),
                evidence: toJson(result.result.assessment.evidence),
                hardBlockers: toJson(result.result.assessment.hard_blockers),
                questions: toJson(result.result.assessment.critical_questions),
                rawResult: toJson(result.raw),
                model: result.result.agent?.model,
                durationMs: result.result.metrics?.wall_ms,
                estimatedCostUsd: result.result.metrics?.estimated_cost_usd ?? undefined,
            },
        });
        await transaction.application.update({
            where: { id: applicationId },
            data: {
                fitStatus,
                fitScore: decision.totalScore,
                fitConfidence: decision.confidence,
                assessmentJobId: null,
                assessmentError: null,
                lastAssessedAt: new Date(),
            },
        });

        if (
            application.onboardingSession &&
            !['AUTO_APPROVE', 'AUTO_REJECT'].includes(decision.recommendation)
        ) {
            const content =
                decision.recommendation === 'NEEDS_INFO'
                    ? questionMessage(result.result.assessment)
                    : 'Thanks — the automated review is complete. A Viral Bridge specialist will make the final decision.';
            await transaction.onboardingMessage.create({
                data: {
                    sessionId: application.onboardingSession.id,
                    role: OnboardingMessageRole.ASSISTANT,
                    content,
                },
            });
        }
    });

    return decision.recommendation as FitRecommendation;
}

async function persistFailedAssessment(applicationId: string, jobId: string, error: string, raw: unknown) {
    const prisma = getPrisma();
    const existing = await prisma.applicationAssessment.findUnique({
        where: { providerJobId: jobId },
    });
    if (existing) return;

    await prisma.$transaction(async (transaction) => {
        const application = await transaction.application.findUnique({
            where: { id: applicationId },
            include: { onboardingSession: true },
        });
        if (!application || application.assessmentJobId !== jobId) return;

        await transaction.applicationAssessment.create({
            data: {
                applicationId,
                providerJobId: jobId,
                runStatus: AssessmentRunStatus.FAILED,
                rawResult: toJson(raw),
                error: error.slice(0, 1_000),
            },
        });
        await transaction.application.update({
            where: { id: applicationId },
            data: {
                fitStatus: FitAssessmentStatus.FAILED,
                assessmentJobId: null,
                assessmentError: error.slice(0, 1_000),
                lastAssessedAt: new Date(),
            },
        });
        if (application.onboardingSession) {
            await transaction.onboardingMessage.create({
                data: {
                    sessionId: application.onboardingSession.id,
                    role: OnboardingMessageRole.ASSISTANT,
                    content:
                        'The automatic review could not finish. Your application has been sent to our team for manual review.',
                },
            });
        }
    });
}

async function finalizeAutoApproval(applicationId: string) {
    const prisma = getPrisma();
    const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
            onboardingSession: true,
            assessments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
    });
    const assessment = application?.assessments[0];
    if (
        !application ||
        !assessment ||
        assessment.recommendation !== FitRecommendation.AUTO_APPROVE ||
        application.status !== ApplicationStatus.PENDING
    ) {
        return;
    }

    try {
        const approval = await approveApplicationAutomatically(applicationId);
        if (application.onboardingSession) {
            await prisma.$transaction([
                prisma.onboardingSession.update({
                    where: { id: application.onboardingSession.id },
                    data: { status: OnboardingSessionStatus.APPROVED },
                }),
                prisma.onboardingMessage.create({
                    data: {
                        sessionId: application.onboardingSession.id,
                        role: OnboardingMessageRole.ASSISTANT,
                        content: approval.emailSent
                            ? 'Your company is a strong fit for Viral Bridge. We approved the application and sent a secure account activation link to your email.'
                            : 'Your company is a strong fit for Viral Bridge. The application is approved, but the activation email could not be delivered. Our team has been notified.',
                    },
                }),
            ]);
        }

        if (!application.telegramNotifiedAt) {
            try {
                const delivery = await sendAutoApprovedApplicationNotification(
                    approval.application,
                    {
                        totalScore: assessment.totalScore ?? 0,
                        confidence: assessment.confidence ?? 0,
                        summary: assessment.summary ?? 'No summary returned.',
                    },
                    approval.emailSent,
                );
                await saveTelegramDelivery(applicationId, delivery);
            } catch (error) {
                await saveTelegramError(applicationId, error);
            }
        }
    } catch (error) {
        if (
            !(error instanceof WorkflowError) ||
            error.code !== 'APPLICATION_ALREADY_REVIEWED'
        ) {
            throw error;
        }
    }
}

async function finalizeAutoRejection(applicationId: string) {
    const prisma = getPrisma();
    const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
            onboardingSession: true,
            assessments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
    });
    const assessment = application?.assessments[0];
    if (
        !application ||
        !assessment ||
        assessment.recommendation !== FitRecommendation.AUTO_REJECT ||
        application.status !== ApplicationStatus.PENDING
    ) {
        return;
    }

    try {
        const rejection = await rejectApplicationAutomatically(
            applicationId,
            `Fit score ${assessment.totalScore ?? 0}/100. ${assessment.summary ?? 'Automatically rejected by fit policy.'}`,
        );
        if (application.onboardingSession) {
            await prisma.onboardingMessage.create({
                data: {
                    sessionId: application.onboardingSession.id,
                    role: OnboardingMessageRole.ASSISTANT,
                    content: rejection.emailSent
                        ? 'The review is complete. We sent the decision to your email.'
                        : 'The review is complete, but we could not deliver the decision email. Our team has been notified.',
                },
            });
        }

        if (!application.telegramNotifiedAt) {
            try {
                const delivery = await sendAutoRejectedApplicationNotification(
                    rejection.application,
                    {
                        totalScore: assessment.totalScore ?? 0,
                        confidence: assessment.confidence ?? 0,
                        summary: assessment.summary ?? 'No summary returned.',
                    },
                    rejection.emailSent,
                );
                await saveTelegramDelivery(applicationId, delivery);
            } catch (error) {
                await saveTelegramError(applicationId, error);
            }
        }
    } catch (error) {
        if (
            !(error instanceof WorkflowError) ||
            error.code !== 'APPLICATION_ALREADY_REVIEWED'
        ) {
            throw error;
        }
    }
}

async function syncSessionBusinessFitAssessment(
    session: Awaited<ReturnType<typeof findSession>>,
    reloadState: () => Promise<ReturnType<typeof serializeOnboardingState>>,
) {
    const application = session.application;
    const jobId = application.assessmentJobId;

    if (application.fitStatus === FitAssessmentStatus.AUTO_APPROVED) {
        await finalizeAutoApproval(application.id);
        return reloadState();
    }
    if (application.fitStatus === FitAssessmentStatus.AUTO_REJECTED) {
        await finalizeAutoRejection(application.id);
        return reloadState();
    }
    if (application.fitStatus !== FitAssessmentStatus.RUNNING || !jobId) {
        return serializeOnboardingState(session);
    }

    const result = await pollBusinessFitJob(jobId);
    if (result.state === 'pending') return serializeOnboardingState(session);

    if (result.state === 'failed') {
        await persistFailedAssessment(application.id, jobId, result.error, result.raw);
        await notifyManualReview(
            application.id,
            `⚠️ Automatic fit assessment failed.\nReason: ${result.error.slice(0, 500)}`,
        );
        return reloadState();
    }

    const recommendation = await persistCompletedAssessment(application.id, jobId, result);
    if (recommendation === FitRecommendation.AUTO_APPROVE) {
        await finalizeAutoApproval(application.id);
    } else if (recommendation === FitRecommendation.AUTO_REJECT) {
        await finalizeAutoRejection(application.id);
    } else if (recommendation === FitRecommendation.MANUAL_REVIEW) {
        const clarificationRounds = await clarificationRoundCount(application.id);
        const decision = decideBusinessFit(result.result.assessment, { clarificationRounds });
        await notifyManualReview(
            application.id,
            manualReviewDetail(result.result.assessment, decision),
        );
    }

    return reloadState();
}

export async function syncBusinessFitAssessment(token: string) {
    const session = await findSession(token);
    return syncSessionBusinessFitAssessment(session, () => getOnboardingState(token));
}

export async function syncBusinessFitAssessmentByApplicationId(applicationId: string) {
    const session = await findSessionByApplicationId(applicationId);
    return syncSessionBusinessFitAssessment(session, async () =>
        serializeOnboardingState(await findSessionByApplicationId(applicationId)),
    );
}

export async function answerOnboardingQuestion(token: string, rawContent: unknown) {
    const session = await findSession(token);
    const content = typeof rawContent === 'string' ? rawContent.trim() : '';

    if (session.application.fitStatus !== FitAssessmentStatus.NEEDS_INFO) {
        throw new OnboardingError(
            'ANSWER_NOT_EXPECTED',
            'This onboarding session is not waiting for an answer',
        );
    }
    if (content.length < 2 || content.length > MAX_ANSWER_LENGTH) {
        throw new OnboardingError(
            'ANSWER_INVALID',
            `Answer must contain between 2 and ${MAX_ANSWER_LENGTH} characters`,
        );
    }

    const prisma = getPrisma();
    const updated = await prisma.application.updateMany({
        where: {
            id: session.application.id,
            fitStatus: FitAssessmentStatus.NEEDS_INFO,
        },
        data: {
            fitStatus: FitAssessmentStatus.QUEUED,
            assessmentJobId: null,
            assessmentError: null,
        },
    });
    if (updated.count !== 1) {
        throw new OnboardingError(
            'ANSWER_NOT_EXPECTED',
            'This onboarding session is no longer waiting for an answer',
        );
    }

    await prisma.onboardingMessage.createMany({
        data: [
            {
                sessionId: session.id,
                role: OnboardingMessageRole.USER,
                content,
            },
            {
                sessionId: session.id,
                role: OnboardingMessageRole.ASSISTANT,
                content: 'Thanks. I am checking the new information now.',
            },
        ],
    });
    await startBusinessFitAssessment(session.application.id);
    return getOnboardingState(token);
}
