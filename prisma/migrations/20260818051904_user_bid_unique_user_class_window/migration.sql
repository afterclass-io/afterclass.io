-- DropIndex
DROP INDEX "user_bid_user_id_class_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "user_bid_user_id_class_id_bid_window_id_key" ON "user_bid"("user_id", "class_id", "bid_window_id");
