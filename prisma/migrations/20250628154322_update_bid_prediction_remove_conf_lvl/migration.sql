/*
  Warnings:

  - You are about to drop the column `clf_confidence_level` on the `bid_prediction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bid_prediction" DROP COLUMN "clf_confidence_level";
