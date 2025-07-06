/*
  Warnings:

  - You are about to drop the `safety_factor_table` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MultiplierType" AS ENUM ('empirical', 'theoretical');

-- CreateEnum
CREATE TYPE "PredictionType" AS ENUM ('median', 'min');

-- DropForeignKey
ALTER TABLE "safety_factor_table" DROP CONSTRAINT "safety_factor_table_acad_term_id_fkey";

-- DropTable
DROP TABLE "safety_factor_table";

-- CreateTable
CREATE TABLE "safety_factor" (
    "acad_term_id" TEXT NOT NULL,
    "prediction_type" "PredictionType" NOT NULL,
    "beats_percentage" INTEGER NOT NULL,
    "multiplier_type" "MultiplierType" NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_factor_pkey" PRIMARY KEY ("acad_term_id","prediction_type","beats_percentage","multiplier_type")
);

-- AddForeignKey
ALTER TABLE "safety_factor" ADD CONSTRAINT "safety_factor_acad_term_id_fkey" FOREIGN KEY ("acad_term_id") REFERENCES "acad_term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
