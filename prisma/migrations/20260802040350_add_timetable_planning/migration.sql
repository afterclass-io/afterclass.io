-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "UserBidStatus" AS ENUM ('PLANNED', 'SECURED', 'MISSED', 'DROPPED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "user_bid" DROP CONSTRAINT "user_bid_bid_prediction_class_id_bid_window_id_fkey";

-- DropForeignKey
ALTER TABLE "user_bid" DROP CONSTRAINT "user_bid_bid_result_class_id_bid_window_id_fkey";

-- AlterTable
ALTER TABLE "user_bid" ADD COLUMN     "status" "UserBidStatus" NOT NULL DEFAULT 'PLANNED';

-- CreateTable
CREATE TABLE "user_timetable" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "acad_term_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "share_token" TEXT,
    "ical_token" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_timetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_timetable_slot" (
    "id" TEXT NOT NULL,
    "timetable_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,

    CONSTRAINT "user_timetable_slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_bid_budget" (
    "user_id" TEXT NOT NULL,
    "acad_term_id" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "user_bid_budget_pkey" PRIMARY KEY ("user_id","acad_term_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_timetable_share_token_key" ON "user_timetable"("share_token");

-- CreateIndex
CREATE UNIQUE INDEX "user_timetable_ical_token_key" ON "user_timetable"("ical_token");

-- CreateIndex
CREATE INDEX "user_timetable_user_id_acad_term_id_idx" ON "user_timetable"("user_id", "acad_term_id");

-- CreateIndex
CREATE INDEX "user_timetable_slot_timetable_id_idx" ON "user_timetable_slot"("timetable_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_timetable_slot_timetable_id_class_id_key" ON "user_timetable_slot"("timetable_id", "class_id");

-- CreateIndex
CREATE INDEX "bid_window_acad_term_id_idx" ON "bid_window"("acad_term_id");

-- CreateIndex
CREATE INDEX "classes_acad_term_id_course_id_idx" ON "classes"("acad_term_id", "course_id");

-- CreateIndex
CREATE INDEX "user_bid_user_id_class_id_idx" ON "user_bid"("user_id", "class_id");

-- AddForeignKey
ALTER TABLE "user_timetable" ADD CONSTRAINT "user_timetable_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_timetable" ADD CONSTRAINT "user_timetable_acad_term_id_fkey" FOREIGN KEY ("acad_term_id") REFERENCES "acad_term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_timetable_slot" ADD CONSTRAINT "user_timetable_slot_timetable_id_fkey" FOREIGN KEY ("timetable_id") REFERENCES "user_timetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_timetable_slot" ADD CONSTRAINT "user_timetable_slot_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bid_budget" ADD CONSTRAINT "user_bid_budget_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bid_budget" ADD CONSTRAINT "user_bid_budget_acad_term_id_fkey" FOREIGN KEY ("acad_term_id") REFERENCES "acad_term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
