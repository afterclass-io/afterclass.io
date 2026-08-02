-- CreateTable
CREATE TABLE "user_roadmap" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "share_token" TEXT,
    "slug" TEXT,
    "faculty_id" INTEGER,
    "published_at" TIMESTAMPTZ(3),
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "matric_term_id" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "share_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_roadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_vote" (
    "id" TEXT NOT NULL,
    "roadmap_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "weight" SMALLINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roadmap_vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_reaction" (
    "roadmap_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reaction" "ReviewReactionType" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roadmap_reaction_pkey" PRIMARY KEY ("roadmap_id","user_id")
);

-- CreateTable
CREATE TABLE "user_roadmap_entry" (
    "id" TEXT NOT NULL,
    "roadmap_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "year_number" INTEGER NOT NULL,
    "term" VARCHAR(3) NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "user_roadmap_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_roadmap_share_token_key" ON "user_roadmap"("share_token");

-- CreateIndex
CREATE UNIQUE INDEX "user_roadmap_slug_key" ON "user_roadmap"("slug");

-- CreateIndex
CREATE INDEX "user_roadmap_user_id_idx" ON "user_roadmap"("user_id");

-- CreateIndex
CREATE INDEX "user_roadmap_visibility_published_at_idx" ON "user_roadmap"("visibility", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_vote_roadmap_id_user_id_key" ON "roadmap_vote"("roadmap_id", "user_id");

-- CreateIndex
CREATE INDEX "user_roadmap_entry_roadmap_id_idx" ON "user_roadmap_entry"("roadmap_id");

-- AddForeignKey
ALTER TABLE "user_roadmap" ADD CONSTRAINT "user_roadmap_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roadmap" ADD CONSTRAINT "user_roadmap_matric_term_id_fkey" FOREIGN KEY ("matric_term_id") REFERENCES "acad_term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_vote" ADD CONSTRAINT "roadmap_vote_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "user_roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_vote" ADD CONSTRAINT "roadmap_vote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_reaction" ADD CONSTRAINT "roadmap_reaction_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "user_roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_reaction" ADD CONSTRAINT "roadmap_reaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roadmap_entry" ADD CONSTRAINT "user_roadmap_entry_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "user_roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roadmap_entry" ADD CONSTRAINT "user_roadmap_entry_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
