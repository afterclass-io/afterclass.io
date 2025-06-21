/*
  Warnings:

  - You are about to drop the column `boss_name` on the `professors` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "professors" DROP COLUMN "boss_name",
ADD COLUMN     "boss_aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];
