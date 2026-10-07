-- CreateEnum
CREATE TYPE "ModerationSurface" AS ENUM ('REVIEW', 'ROADMAP');

-- CreateEnum
CREATE TYPE "ModerationVerdict" AS ENUM ('VIOLATION', 'CLEARED', 'ERROR');

-- DropForeignKey
ALTER TABLE "review_votes" DROP CONSTRAINT "review_votes_review_id_fkey";

-- DropForeignKey
ALTER TABLE "review_labels" DROP CONSTRAINT "review_labels_review_id_fkey";

-- DropForeignKey
ALTER TABLE "review_events" DROP CONSTRAINT "review_events_review_id_fkey";

-- DropForeignKey
ALTER TABLE "review_reactions" DROP CONSTRAINT "review_reactions_review_id_fkey";

-- CreateTable
CREATE TABLE "moderation_reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "review_id" TEXT,
    "roadmap_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_logs" (
    "id" TEXT NOT NULL,
    "surface" "ModerationSurface" NOT NULL,
    "item_id" TEXT NOT NULL,
    "verdict" "ModerationVerdict" NOT NULL,
    "policy_rule" VARCHAR(40),
    "language" VARCHAR(20),
    "rationale" VARCHAR(300),
    "model" VARCHAR(120) NOT NULL,
    "removed_text" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderation_reports_reporter_id_idx" ON "moderation_reports"("reporter_id");

-- CreateIndex
CREATE INDEX "moderation_reports_review_id_created_at_idx" ON "moderation_reports"("review_id", "created_at");

-- CreateIndex
CREATE INDEX "moderation_reports_roadmap_id_created_at_idx" ON "moderation_reports"("roadmap_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "moderation_reports_review_id_reporter_id_key" ON "moderation_reports"("review_id", "reporter_id");

-- CreateIndex
CREATE UNIQUE INDEX "moderation_reports_roadmap_id_reporter_id_key" ON "moderation_reports"("roadmap_id", "reporter_id");

-- CreateIndex
CREATE INDEX "moderation_logs_surface_item_id_verdict_created_at_idx" ON "moderation_logs"("surface", "item_id", "verdict", "created_at" DESC);

-- CreateIndex
CREATE INDEX "moderation_logs_created_at_idx" ON "moderation_logs"("created_at");

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_labels" ADD CONSTRAINT "review_labels_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_reactions" ADD CONSTRAINT "review_reactions_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "user_roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- =================================================== --
-- BELOW IS NOT DONE BY PRISMA, THIS IS MANUALLY ADDED --
-- =================================================== --
-- Exactly one item relation per report. Prisma cannot express this; it does
-- not diff CHECK constraints, so later `migrate dev` runs see no drift.
ALTER TABLE "moderation_reports"
  ADD CONSTRAINT "moderation_reports_exactly_one_item"
  CHECK (num_nonnulls("review_id", "roadmap_id") = 1);
