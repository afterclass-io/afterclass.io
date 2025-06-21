/*
  Warnings:

  - A unique constraint covering the columns `[boss_id,acad_term_id,professor_id]` on the table `classes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[course_id,section,acad_term_id,professor_id]` on the table `classes` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "classes_boss_id_acad_term_id_key";

-- DropIndex
DROP INDEX "classes_course_id_section_acad_term_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "classes_boss_id_acad_term_id_professor_id_key" ON "classes"("boss_id", "acad_term_id", "professor_id");

-- CreateIndex
CREATE UNIQUE INDEX "classes_course_id_section_acad_term_id_professor_id_key" ON "classes"("course_id", "section", "acad_term_id", "professor_id");
