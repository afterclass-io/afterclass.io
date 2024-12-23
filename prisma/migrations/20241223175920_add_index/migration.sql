-- CreateIndex
CREATE INDEX "classes_course_id_idx" ON "classes"("course_id");

-- CreateIndex
CREATE INDEX "classes_professor_id_idx" ON "classes"("professor_id");

-- CreateIndex
CREATE INDEX "review_labels_review_id_idx" ON "review_labels"("review_id");

-- CreateIndex
CREATE INDEX "review_votes_review_id_idx" ON "review_votes"("review_id");

-- CreateIndex
CREATE INDEX "reviews_created_at_idx" ON "reviews"("created_at");

-- CreateIndex
CREATE INDEX "reviews_reviewed_course_id_idx" ON "reviews"("reviewed_course_id");

-- CreateIndex
CREATE INDEX "reviews_reviewed_professor_id_idx" ON "reviews"("reviewed_professor_id");
