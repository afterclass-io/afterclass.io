-- CreateEnum
CREATE TYPE "ReviewReactionType" AS ENUM ('💜', '🙏', '💅', '🤣', '😭', '😦');

-- CreateTable
CREATE TABLE "review_reactions" (
    "review_id" TEXT NOT NULL,
    "reacting_user_id" TEXT NOT NULL,
    "reaction" "ReviewReactionType" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "review_reactions_pkey" PRIMARY KEY ("review_id","reacting_user_id")
);

-- CreateIndex
CREATE INDEX "review_reactions_review_id_reacting_user_id_idx" ON "review_reactions"("review_id", "reacting_user_id");

-- AddForeignKey
ALTER TABLE "review_reactions" ADD CONSTRAINT "review_reactions_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_reactions" ADD CONSTRAINT "review_reactions_reacting_user_id_fkey" FOREIGN KEY ("reacting_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
