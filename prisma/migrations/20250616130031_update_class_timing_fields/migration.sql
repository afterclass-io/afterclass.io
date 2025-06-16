-- AlterTable
ALTER TABLE "class_exam_timing" ALTER COLUMN "day_of_week" DROP NOT NULL,
ALTER COLUMN "day_of_week" SET DATA TYPE TEXT,
ALTER COLUMN "venue" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "class_timing" ALTER COLUMN "day_of_week" DROP NOT NULL,
ALTER COLUMN "day_of_week" SET DATA TYPE TEXT,
ALTER COLUMN "venue" SET DATA TYPE TEXT;
