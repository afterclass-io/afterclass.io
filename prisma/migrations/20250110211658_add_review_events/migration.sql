-- CreateEnum
CREATE TYPE "ReviewEventType" AS ENUM ('VIEW', 'SHARE', 'REACTION', 'UPVOTE', 'DOWNVOTE', 'INTERACTION');

-- CreateTable
CREATE TABLE "review_events" (
    "id" UUID NOT NULL,
    "review_id" TEXT NOT NULL,
    "event_type" "ReviewEventType" NOT NULL,
    "triggering_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_triggering_user_id_fkey" FOREIGN KEY ("triggering_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
