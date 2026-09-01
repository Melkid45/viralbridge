import 'server-only';

import { z } from 'zod';

const factorSchema = z.object({
    score: z.number().int().min(0).max(25),
    rationale: z.string().min(1).max(2_000),
});

const assessmentSchema = z.object({
    company_match: z
        .object({
            status: z.enum(['CONFIRMED', 'UNCERTAIN', 'MISMATCH']),
            rationale: z.string().min(1).max(1_000),
        })
        .default({
            status: 'UNCERTAIN',
            rationale: 'The assessment did not confirm the submitted company identity.',
        }),
    company_profile: z.object({
        name: z.string().max(300),
        website: z.string().max(2_048),
        description: z.string().max(3_000),
        business_model: z.string().max(1_000),
        headquarters: z.string().max(500),
        operating_regions: z.array(z.string().max(200)).max(30),
    }),
    factors: z.object({
        scalability: factorSchema,
        regionality: factorSchema,
        market_opportunity: factorSchema,
        business_economics: factorSchema,
    }),
    confidence: z.number().min(0).max(1),
    evidence: z
        .array(
            z.object({
                url: z.string().url().max(2_048),
                title: z.string().max(500),
                claim: z.string().max(2_000),
            }),
        )
        .max(20),
    hard_blockers: z
        .array(
            z.enum([
                'LOCAL_SINGLE_LOCATION',
                'NO_PUBLIC_WEBSITE',
                'NO_CLEAR_OFFER',
                'PROHIBITED_BUSINESS',
                'INSUFFICIENT_EVIDENCE',
            ]),
        )
        .max(10),
    critical_questions: z.array(z.string().min(1).max(500)).max(3),
    summary: z.string().min(1).max(3_000),
});

const completedJobSchema = z.object({
    ok: z.literal(true),
    assessment: assessmentSchema,
    metrics: z
        .object({
            wall_ms: z.number().int().nonnegative().optional(),
            estimated_cost_usd: z.number().nonnegative().nullable().optional(),
        })
        .passthrough()
        .optional(),
    agent: z
        .object({
            model: z.string().max(120).optional(),
        })
        .passthrough()
        .optional(),
});

const failedJobSchema = z.object({
    ok: z.literal(false),
    error: z.string().max(4_000).optional(),
    error_type: z.string().max(200).optional(),
    metrics: z
        .object({
            wall_ms: z.number().int().nonnegative().optional(),
        })
        .passthrough()
        .optional(),
});

export type BusinessFitAssessment = z.infer<typeof assessmentSchema>;

export type BusinessFitDecision = {
    recommendation: 'AUTO_APPROVE' | 'AUTO_REJECT' | 'NEEDS_INFO' | 'MANUAL_REVIEW';
    totalScore: number;
    confidence: number;
    evidenceDomains: number;
    reasons: string[];
};

export const BUSINESS_FIT_POLICY = {
    autoRejectBelowScore: 50,
    manualReviewMaxScore: 55,
    autoApproveScore: 56,
    minimumConfidence: 0.8,
    minimumEvidenceDomains: 2,
    minimumScalabilityScore: 12,
    minimumRegionalityScore: 12,
    maximumClarificationRounds: 2,
} as const;

type SubmitInput = {
    applicationId: string;
    companyName: string;
    website?: string | null;
    fullName?: string | null;
    email: string;
    phone?: string | null;
    answers: string[];
};

function getModalConfiguration() {
    const baseUrl = process.env.MODAL_BUSINESS_FIT_URL?.trim().replace(/\/+$/, '');
    const modalKey = process.env.MODAL_PROXY_TOKEN_ID?.trim();
    const modalSecret = process.env.MODAL_PROXY_TOKEN_SECRET?.trim();

    if (!baseUrl) throw new Error('Missing required environment variable: MODAL_BUSINESS_FIT_URL');
    if (!modalKey) throw new Error('Missing required environment variable: MODAL_PROXY_TOKEN_ID');
    if (!modalSecret) throw new Error('Missing required environment variable: MODAL_PROXY_TOKEN_SECRET');

    return { baseUrl, modalKey, modalSecret };
}

function modalHeaders() {
    const { modalKey, modalSecret } = getModalConfiguration();
    return {
        'Content-Type': 'application/json',
        'Modal-Key': modalKey,
        'Modal-Secret': modalSecret,
    };
}

async function readJson(response: Response) {
    const text = await response.text();
    try {
        return JSON.parse(text) as unknown;
    } catch {
        throw new Error(`Modal returned invalid JSON (${response.status})`);
    }
}

export async function submitBusinessFitJob(input: SubmitInput) {
    const { baseUrl } = getModalConfiguration();
    const response = await fetch(`${baseUrl}/submit`, {
        method: 'POST',
        headers: modalHeaders(),
        body: JSON.stringify({
            request_id: crypto.randomUUID(),
            application_id: input.applicationId,
            company_name: input.companyName,
            website: input.website,
            full_name: input.fullName,
            email: input.email,
            phone: input.phone,
            onboarding_answers: input.answers,
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
    });
    const payload = await readJson(response);

    if (!response.ok) {
        throw new Error(`Modal job submission failed (${response.status})`);
    }

    const parsed = z.object({ call_id: z.string().min(1).max(255) }).safeParse(payload);
    if (!parsed.success) throw new Error('Modal did not return a job ID');
    return parsed.data.call_id;
}

export async function pollBusinessFitJob(jobId: string) {
    const { baseUrl } = getModalConfiguration();
    const response = await fetch(`${baseUrl}/result/${encodeURIComponent(jobId)}`, {
        method: 'GET',
        headers: modalHeaders(),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
    });

    if (response.status === 202) return { state: 'pending' as const };

    const payload = await readJson(response);
    if (!response.ok) {
        const failed = failedJobSchema.safeParse(payload);
        return {
            state: 'failed' as const,
            error: failed.success
                ? failed.data.error ?? failed.data.error_type ?? 'Business fit job failed'
                : `Modal result request failed (${response.status})`,
            raw: payload,
        };
    }

    const completed = completedJobSchema.safeParse(payload);
    if (completed.success) {
        return { state: 'completed' as const, result: completed.data, raw: payload };
    }

    const failed = failedJobSchema.safeParse(payload);
    if (failed.success) {
        return {
            state: 'failed' as const,
            error: failed.data.error ?? failed.data.error_type ?? 'Business fit job failed',
            raw: payload,
        };
    }

    return {
        state: 'failed' as const,
        error: 'Modal returned an invalid business fit result',
        raw: payload,
    };
}

export function decideBusinessFit(
    assessment: BusinessFitAssessment,
    context: { clarificationRounds?: number } = {},
): BusinessFitDecision {
    const totalScore = Object.values(assessment.factors).reduce(
        (total, factor) => total + factor.score,
        0,
    );
    const evidenceDomains = new Set(
        assessment.evidence.flatMap((item) => {
            try {
                return [new URL(item.url).hostname.replace(/^www\./, '').toLowerCase()];
            } catch {
                return [];
            }
        }),
    ).size;
    const reasons: string[] = [];
    const evidenceIsSufficient =
        evidenceDomains >= BUSINESS_FIT_POLICY.minimumEvidenceDomains;
    const confidenceIsSufficient =
        assessment.confidence >= BUSINESS_FIT_POLICY.minimumConfidence;
    const clarificationRounds = Math.max(0, context.clarificationRounds ?? 0);
    const companyIsConfirmed = assessment.company_match.status === 'CONFIRMED';
    const dataBlockers = new Set([
        'NO_PUBLIC_WEBSITE',
        'NO_CLEAR_OFFER',
        'INSUFFICIENT_EVIDENCE',
    ]);
    const hasDataBlocker = assessment.hard_blockers.some((blocker) =>
        dataBlockers.has(blocker),
    );
    const hasProhibitedBusiness = assessment.hard_blockers.includes(
        'PROHIBITED_BUSINESS',
    );
    const clearlyMeetsApprovalPolicy =
        totalScore >= BUSINESS_FIT_POLICY.autoApproveScore &&
        confidenceIsSufficient &&
        evidenceIsSufficient &&
        companyIsConfirmed &&
        assessment.hard_blockers.length === 0 &&
        assessment.factors.scalability.score >=
            BUSINESS_FIT_POLICY.minimumScalabilityScore &&
        assessment.factors.regionality.score >=
            BUSINESS_FIT_POLICY.minimumRegionalityScore;
    const hasDecisionCriticalQuestions =
        assessment.critical_questions.length > 0 && !clearlyMeetsApprovalPolicy;
    const needsClarification = !companyIsConfirmed || hasDecisionCriticalQuestions;
    const canMakeAutomaticDecision =
        confidenceIsSufficient &&
        evidenceIsSufficient &&
        companyIsConfirmed &&
        !hasDataBlocker &&
        !hasDecisionCriticalQuestions;

    if (
        hasProhibitedBusiness &&
        companyIsConfirmed &&
        confidenceIsSufficient &&
        evidenceIsSufficient
    ) {
        reasons.push('The business is outside the supported policy.');
        return {
            recommendation: 'AUTO_REJECT',
            totalScore,
            confidence: assessment.confidence,
            evidenceDomains,
            reasons,
        };
    }

    if (
        needsClarification &&
        clarificationRounds < BUSINESS_FIT_POLICY.maximumClarificationRounds
    ) {
        if (!companyIsConfirmed) {
            reasons.push(`Company identity is ${assessment.company_match.status.toLowerCase()}.`);
        }
        if (hasDecisionCriticalQuestions) {
            reasons.push('Client-provided context can materially change the assessment.');
        }
        return {
            recommendation: 'NEEDS_INFO',
            totalScore,
            confidence: assessment.confidence,
            evidenceDomains,
            reasons,
        };
    }

    if (needsClarification) {
        reasons.push('The clarification round did not resolve the assessment uncertainty.');
        return {
            recommendation: 'MANUAL_REVIEW',
            totalScore,
            confidence: assessment.confidence,
            evidenceDomains,
            reasons,
        };
    }

    if (totalScore < BUSINESS_FIT_POLICY.autoRejectBelowScore) {
        if (canMakeAutomaticDecision) {
            reasons.push(
                `Score ${totalScore} is below ${BUSINESS_FIT_POLICY.autoRejectBelowScore}.`,
            );
            return {
                recommendation: 'AUTO_REJECT',
                totalScore,
                confidence: assessment.confidence,
                evidenceDomains,
                reasons,
            };
        }

        reasons.push('The score is low, but the evidence is not strong enough for automatic rejection.');
        if (!confidenceIsSufficient) reasons.push('Assessment confidence is too low.');
        if (!evidenceIsSufficient) reasons.push('Independent public evidence is insufficient.');
        if (hasDataBlocker) reasons.push('Critical company information is missing.');
        if (hasDecisionCriticalQuestions) {
            reasons.push('Critical business information is still missing.');
        }
        return {
            recommendation: 'MANUAL_REVIEW',
            totalScore,
            confidence: assessment.confidence,
            evidenceDomains,
            reasons,
        };
    }

    if (totalScore <= BUSINESS_FIT_POLICY.manualReviewMaxScore) {
        reasons.push(
            `Score ${totalScore} is in the ${BUSINESS_FIT_POLICY.autoRejectBelowScore}–${BUSINESS_FIT_POLICY.manualReviewMaxScore} manual-review range.`,
        );
        return {
            recommendation: 'MANUAL_REVIEW',
            totalScore,
            confidence: assessment.confidence,
            evidenceDomains,
            reasons,
        };
    }

    if (assessment.hard_blockers.length > 0) {
        reasons.push(`Blocking signals: ${assessment.hard_blockers.join(', ')}.`);
    }
    if (!confidenceIsSufficient) {
        reasons.push('Assessment confidence is too low for automatic approval.');
    }
    if (!evidenceIsSufficient) {
        reasons.push('Independent public evidence is insufficient.');
    }
    if (
        assessment.factors.scalability.score < BUSINESS_FIT_POLICY.minimumScalabilityScore
    ) {
        reasons.push('Scalability signal is too weak.');
    }
    if (
        assessment.factors.regionality.score < BUSINESS_FIT_POLICY.minimumRegionalityScore
    ) {
        reasons.push('Regional reach is too limited.');
    }

    return {
        recommendation: reasons.length === 0 ? 'AUTO_APPROVE' : 'MANUAL_REVIEW',
        totalScore,
        confidence: assessment.confidence,
        evidenceDomains,
        reasons,
    };
}
