-- CreateTable
CREATE TABLE "prediction_result" (
    "class_id" TEXT NOT NULL,
    "bid_window_id" INTEGER NOT NULL,
    "model_version" TEXT NOT NULL,
    "clf_predicted" BOOLEAN NOT NULL,
    "clf_prob_no_bid" DOUBLE PRECISION NOT NULL,
    "clf_prob_bid" DOUBLE PRECISION NOT NULL,
    "clf_confidence_score" DOUBLE PRECISION NOT NULL,
    "clf_confidence_level" TEXT NOT NULL,
    "median_predicted" DOUBLE PRECISION NOT NULL,
    "median_lower_95ci" DOUBLE PRECISION NOT NULL,
    "median_upper_95ci" DOUBLE PRECISION NOT NULL,
    "median_uncertainty" DOUBLE PRECISION NOT NULL,
    "min_predicted" DOUBLE PRECISION NOT NULL,
    "min_lower_95ci" DOUBLE PRECISION NOT NULL,
    "min_upper_95ci" DOUBLE PRECISION NOT NULL,
    "min_uncertainty" DOUBLE PRECISION NOT NULL,
    "recommendations" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_result_pkey" PRIMARY KEY ("class_id","bid_window_id")
);

-- CreateTable
CREATE TABLE "safety_factor_table" (
    "acad_term_id" TEXT NOT NULL,
    "prediction_type" TEXT NOT NULL,
    "safety_factor" DOUBLE PRECISION NOT NULL,
    "tpr" DOUBLE PRECISION NOT NULL,
    "mean_loss" DOUBLE PRECISION NOT NULL,
    "under_prediction_rate" DOUBLE PRECISION,
    "mae" DOUBLE PRECISION NOT NULL,
    "mse" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_factor_table_pkey" PRIMARY KEY ("acad_term_id","prediction_type","safety_factor")
);

-- CreateIndex
CREATE INDEX "prediction_result_model_version_idx" ON "prediction_result"("model_version");

-- AddForeignKey
ALTER TABLE "prediction_result" ADD CONSTRAINT "prediction_result_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_result" ADD CONSTRAINT "prediction_result_bid_window_id_fkey" FOREIGN KEY ("bid_window_id") REFERENCES "bid_window"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_factor_table" ADD CONSTRAINT "safety_factor_table_acad_term_id_fkey" FOREIGN KEY ("acad_term_id") REFERENCES "acad_term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
