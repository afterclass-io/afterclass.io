/*
  Warnings:

  - The values [MISSED] on the enum `UserBidStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserBidStatus_new" AS ENUM ('PLANNED', 'SECURED', 'DROPPED', 'CANCELLED', 'PARTICIPATED');
ALTER TABLE "public"."user_bid" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "user_bid" ALTER COLUMN "status" TYPE "UserBidStatus_new" USING ("status"::text::"UserBidStatus_new");
ALTER TYPE "UserBidStatus" RENAME TO "UserBidStatus_old";
ALTER TYPE "UserBidStatus_new" RENAME TO "UserBidStatus";
DROP TYPE "public"."UserBidStatus_old";
ALTER TABLE "user_bid" ALTER COLUMN "status" SET DEFAULT 'PLANNED';
COMMIT;

-- DropIndex
DROP INDEX "courses_code_name_trgm_idx";

-- AddForeignKey
ALTER TABLE "chat_usage" ADD CONSTRAINT "chat_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
