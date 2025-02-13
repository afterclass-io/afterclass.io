/*
  Warnings:

  - Added the required column `course_area` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `enrolment_requirements` to the `courses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "course_area" TEXT NOT NULL,
ADD COLUMN     "enrolment_requirements" TEXT NOT NULL;
