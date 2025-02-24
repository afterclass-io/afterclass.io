-- CreateEnum
CREATE TYPE "GradingBasis" AS ENUM ('Pass/Fail', 'Graded', 'NA');

-- AlterTable
-- Ensured to rename column from label to section.
ALTER TABLE "classes" RENAME COLUMN "label" TO "section";

ALTER TABLE "classes"
ADD COLUMN     "acad_term_id" TEXT,
ADD COLUMN     "boss_id" INTEGER,
ADD COLUMN     "class_time" TEXT,
ADD COLUMN     "course_outline_url" TEXT,
ADD COLUMN     "grading_basis" "GradingBasis";

-- CreateTable
CREATE TABLE "acad_term" (
    "id" TEXT NOT NULL,
    "acad_year_start" INTEGER,
    "acad_year_end" INTEGER,
    "term" VARCHAR(2),
    "boss_id" INTEGER,
    "start_dt" TIMESTAMPTZ(3),
    "end_dt" TIMESTAMPTZ(3),

    CONSTRAINT "acad_term_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_acad_term_id_fkey" FOREIGN KEY ("acad_term_id") REFERENCES "acad_term"("id") ON DELETE SET NULL ON UPDATE CASCADE;
