-- CreateTable
CREATE TABLE "class_timing" (
    "id" SERIAL NOT NULL,
    "class_id" INTEGER,
    "start_date" TIMESTAMPTZ(3),
    "end_date" TIMESTAMPTZ(3),
    "day_of_week" VARCHAR(3),
    "start_time" TEXT,
    "end_time" TEXT,
    "venue" VARCHAR(255),

    CONSTRAINT "class_timing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_timing_class_id_idx" ON "class_timing"("class_id");

-- AddForeignKey
ALTER TABLE "class_timing" ADD CONSTRAINT "class_timing_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
