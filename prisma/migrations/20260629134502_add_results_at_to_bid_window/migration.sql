-- AlterTable
ALTER TABLE "bid_window" ADD COLUMN     "opens_at"   TIMESTAMPTZ(3);
ALTER TABLE "bid_window" ADD COLUMN     "closes_at"  TIMESTAMPTZ(3);
ALTER TABLE "bid_window" ADD COLUMN     "results_at" TIMESTAMPTZ(3);
