-- CreateTable
CREATE TABLE "meeting_polls" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "agenda" VARCHAR(2000),
    "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "creator_id" TEXT NOT NULL,
    "course_id" TEXT,
    "section" VARCHAR(10),
    "team_identifier" VARCHAR(50),
    "acad_term_id" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "start_hour" INTEGER NOT NULL DEFAULT 8,
    "end_hour" INTEGER NOT NULL DEFAULT 22,
    "slot_duration_minutes" INTEGER NOT NULL DEFAULT 15,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "meeting_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_participants" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "available_slots" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "if_needed_slots" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meeting_polls_slug_key" ON "meeting_polls"("slug");

-- CreateIndex
CREATE INDEX "meeting_polls_creator_id_created_at_idx" ON "meeting_polls"("creator_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "meeting_polls_course_id_acad_term_id_idx" ON "meeting_polls"("course_id", "acad_term_id");

-- CreateIndex
CREATE INDEX "meeting_polls_acad_term_id_idx" ON "meeting_polls"("acad_term_id");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_participants_poll_id_user_id_key" ON "meeting_participants"("poll_id", "user_id");

-- CreateIndex
CREATE INDEX "meeting_participants_user_id_created_at_idx" ON "meeting_participants"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "meeting_polls" ADD CONSTRAINT "meeting_polls_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_polls" ADD CONSTRAINT "meeting_polls_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_polls" ADD CONSTRAINT "meeting_polls_acad_term_id_fkey" FOREIGN KEY ("acad_term_id") REFERENCES "acad_term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "meeting_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
