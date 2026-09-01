ALTER TYPE "FitAssessmentStatus" ADD VALUE 'AUTO_REJECTED';
ALTER TYPE "FitRecommendation" ADD VALUE 'AUTO_REJECT';

ALTER TABLE "Application"
ADD COLUMN "decisionEmailSentAt" TIMESTAMP(3),
ADD COLUMN "decisionEmailDeliveryError" VARCHAR(1000);
