-- CreateTable
CREATE TABLE "chat_usage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cached_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "spend_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_spend" (
    "period" TEXT NOT NULL,
    "total_spend_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_spend_pkey" PRIMARY KEY ("period")
);

-- CreateTable
CREATE TABLE "rate_limit" (
    "key" TEXT NOT NULL,
    "window_start" BIGINT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "chat_usage_period_idx" ON "chat_usage"("period");

-- CreateIndex
CREATE UNIQUE INDEX "chat_usage_user_id_period_key" ON "chat_usage"("user_id", "period");


-- Typo-tolerant course search: trigram similarity + accelerated ILIKE/regex.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index over code and name; speeds up ILIKE/`%..%`, regex, and
-- similarity()/word_similarity() on the courses table.
CREATE INDEX IF NOT EXISTS courses_code_name_trgm_idx
  ON courses USING GIN (code gin_trgm_ops, name gin_trgm_ops);
