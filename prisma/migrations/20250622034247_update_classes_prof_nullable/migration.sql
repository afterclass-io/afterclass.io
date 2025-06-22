-- DropForeignKey
ALTER TABLE "classes" DROP CONSTRAINT "classes_professor_id_fkey";

-- AlterTable
ALTER TABLE "classes" ALTER COLUMN "professor_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
