/*
  Warnings:

  - You are about to drop the column `class_time` on the `classes` table. All the data in the column will be lost.
  - Made the column `acad_year_start` on table `acad_term` required. This step will fail if there are existing NULL values in that column.
  - Made the column `acad_year_end` on table `acad_term` required. This step will fail if there are existing NULL values in that column.
  - Made the column `term` on table `acad_term` required. This step will fail if there are existing NULL values in that column.
  - Made the column `boss_id` on table `acad_term` required. This step will fail if there are existing NULL values in that column.
  - Made the column `start_dt` on table `acad_term` required. This step will fail if there are existing NULL values in that column.
  - Made the column `end_dt` on table `acad_term` required. This step will fail if there are existing NULL values in that column.
  - Made the column `acad_term_id` on table `bid_window` required. This step will fail if there are existing NULL values in that column.
  - Made the column `round` on table `bid_window` required. This step will fail if there are existing NULL values in that column.
  - Made the column `window` on table `bid_window` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total` on table `class_availability` required. This step will fail if there are existing NULL values in that column.
  - Made the column `current_enrolled` on table `class_availability` required. This step will fail if there are existing NULL values in that column.
  - Made the column `reserved` on table `class_availability` required. This step will fail if there are existing NULL values in that column.
  - Made the column `available` on table `class_availability` required. This step will fail if there are existing NULL values in that column.
  - Made the column `class_id` on table `class_exam_timing` required. This step will fail if there are existing NULL values in that column.
  - Made the column `date` on table `class_exam_timing` required. This step will fail if there are existing NULL values in that column.
  - Made the column `day_of_week` on table `class_exam_timing` required. This step will fail if there are existing NULL values in that column.
  - Made the column `start_time` on table `class_exam_timing` required. This step will fail if there are existing NULL values in that column.
  - Made the column `end_time` on table `class_exam_timing` required. This step will fail if there are existing NULL values in that column.
  - Made the column `class_id` on table `class_timing` required. This step will fail if there are existing NULL values in that column.
  - Made the column `start_date` on table `class_timing` required. This step will fail if there are existing NULL values in that column.
  - Made the column `end_date` on table `class_timing` required. This step will fail if there are existing NULL values in that column.
  - Made the column `day_of_week` on table `class_timing` required. This step will fail if there are existing NULL values in that column.
  - Made the column `start_time` on table `class_timing` required. This step will fail if there are existing NULL values in that column.
  - Made the column `end_time` on table `class_timing` required. This step will fail if there are existing NULL values in that column.
  - Made the column `venue` on table `class_timing` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "bid_window" DROP CONSTRAINT "bid_window_acad_term_id_fkey";

-- DropForeignKey
ALTER TABLE "class_exam_timing" DROP CONSTRAINT "class_exam_timing_class_id_fkey";

-- DropForeignKey
ALTER TABLE "class_timing" DROP CONSTRAINT "class_timing_class_id_fkey";

-- AlterTable
ALTER TABLE "acad_term" ALTER COLUMN "acad_year_start" SET NOT NULL,
ALTER COLUMN "acad_year_end" SET NOT NULL,
ALTER COLUMN "term" SET NOT NULL,
ALTER COLUMN "boss_id" SET NOT NULL,
ALTER COLUMN "start_dt" SET NOT NULL,
ALTER COLUMN "end_dt" SET NOT NULL;

-- AlterTable
ALTER TABLE "bid_window" ALTER COLUMN "acad_term_id" SET NOT NULL,
ALTER COLUMN "round" SET NOT NULL,
ALTER COLUMN "window" SET NOT NULL;

-- AlterTable
ALTER TABLE "class_availability" ALTER COLUMN "total" SET NOT NULL,
ALTER COLUMN "current_enrolled" SET NOT NULL,
ALTER COLUMN "reserved" SET NOT NULL,
ALTER COLUMN "available" SET NOT NULL;

-- AlterTable
ALTER TABLE "class_exam_timing" ALTER COLUMN "class_id" SET NOT NULL,
ALTER COLUMN "date" SET NOT NULL,
ALTER COLUMN "day_of_week" SET NOT NULL,
ALTER COLUMN "start_time" SET NOT NULL,
ALTER COLUMN "end_time" SET NOT NULL;

-- AlterTable
ALTER TABLE "class_timing" ALTER COLUMN "class_id" SET NOT NULL,
ALTER COLUMN "start_date" SET NOT NULL,
ALTER COLUMN "end_date" SET NOT NULL,
ALTER COLUMN "day_of_week" SET NOT NULL,
ALTER COLUMN "start_time" SET NOT NULL,
ALTER COLUMN "end_time" SET NOT NULL,
ALTER COLUMN "venue" SET NOT NULL;

-- AlterTable
ALTER TABLE "classes" DROP COLUMN "class_time";

-- CreateTable
CREATE TABLE "bid_result" (
    "bid_window_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,
    "vacancy" INTEGER NOT NULL,
    "opening_vacancy" INTEGER NOT NULL,
    "before_process_vacancy" INTEGER NOT NULL,
    "d_i_c_e" INTEGER NOT NULL,
    "after_process_vacancy" INTEGER NOT NULL,
    "enrolled_students" INTEGER NOT NULL,
    "bid_actual_median" DOUBLE PRECISION NOT NULL,
    "bid_actual_min" DOUBLE PRECISION NOT NULL,
    "bid_predicted_median" DOUBLE PRECISION NOT NULL,
    "bid_predicted_min" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "bid_result_pkey" PRIMARY KEY ("bid_window_id","class_id")
);

-- AddForeignKey
ALTER TABLE "class_timing" ADD CONSTRAINT "class_timing_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_exam_timing" ADD CONSTRAINT "class_exam_timing_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_window" ADD CONSTRAINT "bid_window_acad_term_id_fkey" FOREIGN KEY ("acad_term_id") REFERENCES "acad_term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_result" ADD CONSTRAINT "bid_result_bid_window_id_fkey" FOREIGN KEY ("bid_window_id") REFERENCES "bid_window"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_result" ADD CONSTRAINT "bid_result_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
