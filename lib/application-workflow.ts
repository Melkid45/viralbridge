import {
    ApplicationReviewSource,
    ApplicationStatus,
    InviteDeliveryStatus,
    MembershipRole,
    Prisma,
    type Application,
} from '@/app/generated/prisma/client';
import { getPrisma } from '@/lib/prisma';
import { sendActivationEmail, sendRejectionEmail } from '@/lib/mail';
import {
    createOpaqueToken,
    hashPassword,
    hashSecretToken,
} from '@/lib/security';
import { createUserSession } from '@/lib/session';

const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1_000;

export class WorkflowError extends Error {
    constructor(
        public readonly code:
            | 'APPLICATION_NOT_FOUND'
            | 'APPLICATION_ALREADY_REVIEWED'
            | 'APPLICATION_NOT_APPROVED'
            | 'APPLICATION_NOT_REJECTED'
            | 'INVITE_INVALID'
            | 'INVITE_EXPIRED'
            | 'INVITE_USED'
            | 'ACCOUNT_EXISTS'
            | 'INVALID_CREDENTIALS',
        message: string,
    ) {
        super(message);
        this.name = 'WorkflowError';
    }
}

async function issueInvite(input: {
    applicationId: string;
    reviewerTelegramId?: number;
    reviewSource: ApplicationReviewSource;
    mode: 'approve' | 'resend';
}) {
    const prisma = getPrisma();
    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);
    const tokenHash = hashSecretToken(token, 'activation');

    const result = await prisma.$transaction(async (transaction) => {
        const application = await transaction.application.findUnique({
            where: { id: input.applicationId },
        });
        if (!application) {
            throw new WorkflowError('APPLICATION_NOT_FOUND', 'Application not found');
        }

        if (input.mode === 'approve') {
            const approved = await transaction.application.updateMany({
                where: {
                    id: input.applicationId,
                    status: ApplicationStatus.PENDING,
                },
                data: {
                    status: ApplicationStatus.APPROVED,
                    reviewedAt: new Date(),
                    reviewedByTelegramId:
                        input.reviewerTelegramId === undefined
                            ? null
                            : BigInt(input.reviewerTelegramId),
                    reviewSource: input.reviewSource,
                    rejectionReason: null,
                },
            });

            if (approved.count !== 1) {
                throw new WorkflowError(
                    'APPLICATION_ALREADY_REVIEWED',
                    `Application is already ${application.status.toLowerCase()}`,
                );
            }
        } else if (application.status !== ApplicationStatus.APPROVED) {
            throw new WorkflowError(
                'APPLICATION_NOT_APPROVED',
                'Only an approved application can receive a new link',
            );
        }

        await transaction.activationInvite.updateMany({
            where: {
                applicationId: input.applicationId,
                usedAt: null,
                revokedAt: null,
            },
            data: { revokedAt: new Date() },
        });

        const invite = await transaction.activationInvite.create({
            data: {
                applicationId: input.applicationId,
                tokenHash,
                expiresAt,
            },
        });

        return {
            application: {
                ...application,
                status: ApplicationStatus.APPROVED,
            },
            invite,
        };
    });

    try {
        await sendActivationEmail({
            email: result.application.email,
            companyName: result.application.companyName,
            token,
            expiresAt,
        });
        await prisma.activationInvite.update({
            where: { id: result.invite.id },
            data: {
                deliveryStatus: InviteDeliveryStatus.SENT,
                emailSentAt: new Date(),
                deliveryError: null,
            },
        });

        return { ...result, emailSent: true as const };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown SMTP error';
        await prisma.activationInvite.update({
            where: { id: result.invite.id },
            data: {
                deliveryStatus: InviteDeliveryStatus.FAILED,
                deliveryError: message.slice(0, 1_000),
            },
        });

        return {
            ...result,
            emailSent: false as const,
            emailError: message,
        };
    }
}

export function approveApplication(applicationId: string, reviewerTelegramId: number) {
    return issueInvite({
        applicationId,
        reviewerTelegramId,
        reviewSource: ApplicationReviewSource.ADMIN_TELEGRAM,
        mode: 'approve',
    });
}

export function approveApplicationAutomatically(applicationId: string) {
    return issueInvite({
        applicationId,
        reviewSource: ApplicationReviewSource.AUTOMATION,
        mode: 'approve',
    });
}

export function resendActivationEmail(applicationId: string, reviewerTelegramId: number) {
    return issueInvite({
        applicationId,
        reviewerTelegramId,
        reviewSource: ApplicationReviewSource.ADMIN_TELEGRAM,
        mode: 'resend',
    });
}

async function deliverRejectionEmail(application: Application) {
    const prisma = getPrisma();

    try {
        await sendRejectionEmail({
            email: application.email,
            companyName: application.companyName,
        });
        await prisma.application.update({
            where: { id: application.id },
            data: {
                decisionEmailSentAt: new Date(),
                decisionEmailDeliveryError: null,
            },
        });
        return { application, emailSent: true as const };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown SMTP error';
        await prisma.application.update({
            where: { id: application.id },
            data: { decisionEmailDeliveryError: message.slice(0, 1_000) },
        });
        return {
            application,
            emailSent: false as const,
            emailError: message,
        };
    }
}

async function rejectApplicationWithEmail(input: {
    applicationId: string;
    reviewerTelegramId?: number;
    reviewSource: ApplicationReviewSource;
    reason: string;
}) {
    const prisma = getPrisma();
    const rejected = await prisma.application.updateMany({
        where: {
            id: input.applicationId,
            status: ApplicationStatus.PENDING,
        },
        data: {
            status: ApplicationStatus.REJECTED,
            reviewedAt: new Date(),
            reviewedByTelegramId:
                input.reviewerTelegramId === undefined
                    ? null
                    : BigInt(input.reviewerTelegramId),
            reviewSource: input.reviewSource,
            rejectionReason: input.reason.slice(0, 500),
            decisionEmailSentAt: null,
            decisionEmailDeliveryError: null,
        },
    });

    if (rejected.count !== 1) {
        const application = await prisma.application.findUnique({
            where: { id: input.applicationId },
        });
        if (!application) {
            throw new WorkflowError('APPLICATION_NOT_FOUND', 'Application not found');
        }
        throw new WorkflowError(
            'APPLICATION_ALREADY_REVIEWED',
            `Application is already ${application.status.toLowerCase()}`,
        );
    }

    const application = await prisma.application.findUniqueOrThrow({
        where: { id: input.applicationId },
    });
    return deliverRejectionEmail(application);
}

export function rejectApplication(applicationId: string, reviewerTelegramId: number) {
    return rejectApplicationWithEmail({
        applicationId,
        reviewerTelegramId,
        reviewSource: ApplicationReviewSource.ADMIN_TELEGRAM,
        reason: 'Rejected by an administrator after manual review.',
    });
}

export function rejectApplicationAutomatically(applicationId: string, reason: string) {
    return rejectApplicationWithEmail({
        applicationId,
        reviewSource: ApplicationReviewSource.AUTOMATION,
        reason,
    });
}

export async function resendRejectionEmail(applicationId: string) {
    const application = await getPrisma().application.findUnique({
        where: { id: applicationId },
    });
    if (!application) {
        throw new WorkflowError('APPLICATION_NOT_FOUND', 'Application not found');
    }
    if (application.status !== ApplicationStatus.REJECTED) {
        throw new WorkflowError(
            'APPLICATION_NOT_REJECTED',
            'Only a rejected application can receive this decision email',
        );
    }
    return deliverRejectionEmail(application);
}

export async function activateAccount(input: {
    token: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
}) {
    const prisma = getPrisma();
    const tokenHash = hashSecretToken(input.token, 'activation');
    const passwordHash = await hashPassword(input.password);
    const now = new Date();

    try {
        return await prisma.$transaction(async (transaction) => {
            const invite = await transaction.activationInvite.findUnique({
                where: { tokenHash },
                include: { application: true },
            });

            if (!invite || invite.revokedAt) {
                throw new WorkflowError('INVITE_INVALID', 'Activation link is invalid');
            }
            if (invite.usedAt) {
                throw new WorkflowError('INVITE_USED', 'Activation link was already used');
            }
            if (invite.expiresAt <= now) {
                throw new WorkflowError('INVITE_EXPIRED', 'Activation link has expired');
            }
            if (invite.application.status !== ApplicationStatus.APPROVED) {
                throw new WorkflowError(
                    'APPLICATION_NOT_APPROVED',
                    'Application is not approved',
                );
            }

            const consumed = await transaction.activationInvite.updateMany({
                where: {
                    id: invite.id,
                    usedAt: null,
                    revokedAt: null,
                    expiresAt: { gt: now },
                },
                data: { usedAt: now },
            });
            if (consumed.count !== 1) {
                throw new WorkflowError('INVITE_USED', 'Activation link was already used');
            }

            const user = await transaction.user.create({
                data: {
                    email: invite.application.email.toLowerCase(),
                    name: invite.application.fullName ?? invite.application.companyName,
                    passwordHash,
                },
            });

            const client = await transaction.client.create({
                data: {
                    applicationId: invite.application.id,
                    name: invite.application.companyName,
                    profile: { create: {} },
                    memberships: {
                        create: {
                            userId: user.id,
                            role: MembershipRole.OWNER,
                        },
                    },
                },
            });

            await transaction.application.update({
                where: { id: invite.application.id },
                data: { status: ApplicationStatus.ACTIVATED },
            });

            const session = await createUserSession(transaction, user.id, {
                ipAddress: input.ipAddress,
                userAgent: input.userAgent,
            });

            return {
                user: { id: user.id, email: user.email, name: user.name },
                client: { id: client.id, name: client.name },
                session,
            };
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            throw new WorkflowError('ACCOUNT_EXISTS', 'An account already exists for this email');
        }
        throw error;
    }
}
