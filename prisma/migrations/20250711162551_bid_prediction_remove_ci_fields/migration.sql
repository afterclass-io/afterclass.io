/*
  Warnings:

  - You are about to drop the column `median_lower_95ci` on the `bid_prediction` table. All the data in the column will be lost.
  - You are about to drop the column `median_upper_95ci` on the `bid_prediction` table. All the data in the column will be lost.
  - You are about to drop the column `min_lower_95ci` on the `bid_prediction` table. All the data in the column will be lost.
  - You are about to drop the column `min_upper_95ci` on the `bid_prediction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bid_prediction" DROP COLUMN "median_lower_95ci",
DROP COLUMN "median_upper_95ci",
DROP COLUMN "min_lower_95ci",
DROP COLUMN "min_upper_95ci";
