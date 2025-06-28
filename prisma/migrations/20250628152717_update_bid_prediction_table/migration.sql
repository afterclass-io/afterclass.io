/*
  Warnings:

  - You are about to drop the column `clf_predicted` on the `bid_prediction` table. All the data in the column will be lost.
  - You are about to drop the column `clf_prob_bid` on the `bid_prediction` table. All the data in the column will be lost.
  - You are about to drop the column `clf_prob_no_bid` on the `bid_prediction` table. All the data in the column will be lost.
  - You are about to drop the column `recommendations` on the `bid_prediction` table. All the data in the column will be lost.
  - Added the required column `clf_has_bids_prob` to the `bid_prediction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bid_prediction" DROP COLUMN "clf_predicted",
DROP COLUMN "clf_prob_no_bid",
DROP COLUMN "recommendations";

ALTER TABLE "bid_prediction" RENAME COLUMN "clf_prob_bid" TO "clf_has_bids_prob";