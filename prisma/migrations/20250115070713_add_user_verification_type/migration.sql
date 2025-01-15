-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('EMAIL', 'GOOGLE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "verification_type" "VerificationType" NOT NULL DEFAULT 'EMAIL';
