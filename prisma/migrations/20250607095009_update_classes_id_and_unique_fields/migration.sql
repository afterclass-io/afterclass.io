/*
  Warnings:

  - The primary key for the `bid_result` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `class_availability` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `classes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[boss_id,acad_term_id]` on the table `classes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[course_id,section,acad_term_id]` on the table `classes` will be added. If there are existing duplicate values, this will fail.
  - Made the column `section` on table `classes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `acad_term_id` on table `classes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `boss_id` on table `classes` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "bid_result" DROP CONSTRAINT "bid_result_class_id_fkey";

-- DropForeignKey
ALTER TABLE "class_availability" DROP CONSTRAINT "class_availability_class_id_fkey";

-- DropForeignKey
ALTER TABLE "class_exam_timing" DROP CONSTRAINT "class_exam_timing_class_id_fkey";

-- DropForeignKey
ALTER TABLE "class_timing" DROP CONSTRAINT "class_timing_class_id_fkey";

-- DropForeignKey
ALTER TABLE "classes" DROP CONSTRAINT "classes_acad_term_id_fkey";

-- AlterTable
ALTER TABLE "bid_result" DROP CONSTRAINT "bid_result_pkey",
ALTER COLUMN "class_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "bid_result_pkey" PRIMARY KEY ("bid_window_id", "class_id");

-- AlterTable
ALTER TABLE "class_availability" DROP CONSTRAINT "class_availability_pkey",
ALTER COLUMN "class_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "class_availability_pkey" PRIMARY KEY ("class_id", "bid_window_id");

-- AlterTable
ALTER TABLE "class_exam_timing" ALTER COLUMN "class_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "class_timing" ALTER COLUMN "class_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "classes" DROP CONSTRAINT "classes_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "section" SET NOT NULL,
ALTER COLUMN "acad_term_id" SET NOT NULL,
ALTER COLUMN "boss_id" SET NOT NULL,
ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "classes_id_seq";

-- CreateIndex
CREATE UNIQUE INDEX "classes_boss_id_acad_term_id_key" ON "classes"("boss_id", "acad_term_id");

-- CreateIndex
CREATE UNIQUE INDEX "classes_course_id_section_acad_term_id_key" ON "classes"("course_id", "section", "acad_term_id");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_acad_term_id_fkey" FOREIGN KEY ("acad_term_id") REFERENCES "acad_term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_timing" ADD CONSTRAINT "class_timing_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_exam_timing" ADD CONSTRAINT "class_exam_timing_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_availability" ADD CONSTRAINT "class_availability_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_result" ADD CONSTRAINT "bid_result_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
