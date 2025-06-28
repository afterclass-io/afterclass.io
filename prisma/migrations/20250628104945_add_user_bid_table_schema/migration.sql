-- CreateTable
CREATE TABLE "user_bid" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "bid_window_id" INTEGER NOT NULL,
    "bid_amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_bid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_bid_user_id_created_at_idx" ON "user_bid"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "user_bid_class_id_bid_window_id_idx" ON "user_bid"("class_id", "bid_window_id");

-- AddForeignKey
ALTER TABLE "user_bid" ADD CONSTRAINT "user_bid_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bid" ADD CONSTRAINT "user_bid_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bid" ADD CONSTRAINT "user_bid_bid_window_id_fkey" FOREIGN KEY ("bid_window_id") REFERENCES "bid_window"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bid" ADD CONSTRAINT "user_bid_bid_result_class_id_bid_window_id_fkey" FOREIGN KEY ("class_id", "bid_window_id") REFERENCES "bid_result"("class_id", "bid_window_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bid" ADD CONSTRAINT "user_bid_bid_prediction_class_id_bid_window_id_fkey" FOREIGN KEY ("class_id", "bid_window_id") REFERENCES "prediction_result"("class_id", "bid_window_id") ON DELETE RESTRICT ON UPDATE CASCADE;
