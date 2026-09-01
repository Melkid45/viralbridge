CREATE TYPE "ApplicationReviewSource" AS ENUM ('ADMIN_TELEGRAM', 'AUTOMATION');
CREATE TYPE "FitAssessmentStatus" AS ENUM ('QUEUED', 'RUNNING', 'NEEDS_INFO', 'MANUAL_REVIEW', 'AUTO_APPROVED', 'FAILED');
CREATE TYPE "FitRecommendation" AS ENUM ('AUTO_APPROVE', 'NEEDS_INFO', 'MANUAL_REVIEW');
CREATE TYPE "AssessmentRunStatus" AS ENUM ('COMPLETED', 'FAILED');
CREATE TYPE "OnboardingSessionStatus" AS ENUM ('ACTIVE', 'APPROVED', 'CLOSED');
CREATE TYPE "OnboardingMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

ALTER TABLE "Application"
ADD COLUMN "reviewSource" "ApplicationReviewSource",
ADD COLUMN "fitStatus" "FitAssessmentStatus" NOT NULL DEFAULT 'QUEUED',
ADD COLUMN "fitScore" INTEGER,
ADD COLUMN "fitConfidence" DOUBLE PRECISION,
ADD COLUMN "assessmentJobId" VARCHAR(255),
ADD COLUMN "assessmentError" VARCHAR(1000),
ADD COLUMN "lastAssessedAt" TIMESTAMP(3);

CREATE TABLE "ApplicationAssessment" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "providerJobId" VARCHAR(255) NOT NULL,
    "runStatus" "AssessmentRunStatus" NOT NULL,
    "recommendation" "FitRecommendation",
    "totalScore" INTEGER,
    "confidence" DOUBLE PRECISION,
    "summary" TEXT,
    "companyProfile" JSONB,
    "factors" JSONB,
    "evidence" JSONB,
    "hardBlockers" JSONB,
    "questions" JSONB,
    "rawResult" JSONB,
    "model" VARCHAR(120),
    "durationMs" INTEGER,
    "estimatedCostUsd" DOUBLE PRECISION,
    "error" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicationAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnboardingSession" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "status" "OnboardingSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OnboardingSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnboardingMessage" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "role" "OnboardingMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnboardingMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Application_fitStatus_createdAt_idx" ON "Application"("fitStatus", "createdAt");
CREATE UNIQUE INDEX "ApplicationAssessment_providerJobId_key" ON "ApplicationAssessment"("providerJobId");
CREATE INDEX "ApplicationAssessment_applicationId_createdAt_idx" ON "ApplicationAssessment"("applicationId", "createdAt");
CREATE UNIQUE INDEX "OnboardingSession_applicationId_key" ON "OnboardingSession"("applicationId");
CREATE UNIQUE INDEX "OnboardingSession_tokenHash_key" ON "OnboardingSession"("tokenHash");
CREATE INDEX "OnboardingSession_expiresAt_idx" ON "OnboardingSession"("expiresAt");
CREATE INDEX "OnboardingMessage_sessionId_createdAt_idx" ON "OnboardingMessage"("sessionId", "createdAt");

ALTER TABLE "ApplicationAssessment" ADD CONSTRAINT "ApplicationAssessment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingSession" ADD CONSTRAINT "OnboardingSession_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingMessage" ADD CONSTRAINT "OnboardingMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnboardingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
