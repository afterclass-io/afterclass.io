/*
  Warnings:

  - You are about to drop the column `label` on the `classes` table. All the data in the column will be lost.

*/
-- AlterTable
-- ALTER TABLE "classes" DROP COLUMN "label";

-- CreateTable
CREATE TABLE "class_availability" (
    "class_id" INTEGER NOT NULL,
    "bid_window_id" INTEGER NOT NULL,
    "total" INTEGER,
    "current_enrolled" INTEGER,
    "reserved" INTEGER,
    "available" INTEGER,

    CONSTRAINT "class_availability_pkey" PRIMARY KEY ("class_id","bid_window_id")
);

-- CreateTable
CREATE TABLE "bid_window" (
    "id" SERIAL NOT NULL,
    "acad_term_id" TEXT,
    "round" VARCHAR(2),
    "window" INTEGER,

    CONSTRAINT "bid_window_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "class_availability" ADD CONSTRAINT "class_availability_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_availability" ADD CONSTRAINT "class_availability_bid_window_id_fkey" FOREIGN KEY ("bid_window_id") REFERENCES "bid_window"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_window" ADD CONSTRAINT "bid_window_acad_term_id_fkey" FOREIGN KEY ("acad_term_id") REFERENCES "acad_term"("id") ON DELETE SET NULL ON UPDATE CASCADE;
