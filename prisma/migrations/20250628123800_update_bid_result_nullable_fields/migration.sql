/*
  Warnings:

  - You are about to drop the column `bid_predicted_median` on the `bid_result` table. All the data in the column will be lost.
  - You are about to drop the column `bid_predicted_min` on the `bid_result` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bid_prediction" RENAME CONSTRAINT "prediction_result_pkey" TO "bid_prediction_pkey";

-- AlterTable
ALTER TABLE "bid_result"
RENAME COLUMN "bid_actual_median" TO "median";

ALTER TABLE "bid_result"
RENAME COLUMN "bid_actual_min" TO "min";

ALTER TABLE "bid_result"
DROP COLUMN "bid_predicted_median",
DROP COLUMN "bid_predicted_min",
ALTER COLUMN "median" DROP NOT NULL,
ALTER COLUMN "min" DROP NOT NULL,
ALTER COLUMN "opening_vacancy" DROP NOT NULL,
ALTER COLUMN "d_i_c_e" DROP NOT NULL,
ALTER COLUMN "after_process_vacancy" DROP NOT NULL;

-- RenameForeignKey
ALTER TABLE "bid_prediction" RENAME CONSTRAINT "prediction_result_bid_window_id_fkey" TO "bid_prediction_bid_window_id_fkey";

-- RenameForeignKey
ALTER TABLE "bid_prediction" RENAME CONSTRAINT "prediction_result_class_id_fkey" TO "bid_prediction_class_id_fkey";

-- RenameIndex
ALTER INDEX "prediction_result_model_version_idx" RENAME TO "bid_prediction_model_version_idx";
