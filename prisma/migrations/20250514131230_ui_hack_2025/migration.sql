-- CreateTable
CREATE TABLE "hack_submission" (
    "id" TEXT NOT NULL,
    "team_name" TEXT NOT NULL,
    "submission_url" TEXT NOT NULL,
    "slide_embed_url" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hack_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hack_submission_vote" (
    "hack_submission_id" TEXT NOT NULL,
    "voter_id" TEXT NOT NULL,
    "weight" SMALLINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hack_submission_vote_pkey" PRIMARY KEY ("hack_submission_id","voter_id")
);

-- AddForeignKey
ALTER TABLE "hack_submission_vote" ADD CONSTRAINT "hack_submission_vote_hack_submission_id_fkey" FOREIGN KEY ("hack_submission_id") REFERENCES "hack_submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hack_submission_vote" ADD CONSTRAINT "hack_submission_vote_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
