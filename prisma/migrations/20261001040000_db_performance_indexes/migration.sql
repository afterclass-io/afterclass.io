-- CreateIndex
CREATE INDEX "reviews_reviewed_course_id_created_at_idx" ON "reviews"("reviewed_course_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reviews_reviewed_professor_id_created_at_idx" ON "reviews"("reviewed_professor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "classes_acad_term_id_professor_id_idx" ON "classes"("acad_term_id", "professor_id");

-- CreateIndex
CREATE INDEX "review_labels_review_id_label_id_idx" ON "review_labels"("review_id", "label_id");

-- CreateIndex
CREATE INDEX "bid_result_class_id_idx" ON "bid_result"("class_id");

-- CreateIndex
CREATE INDEX "user_timetable_slot_class_id_idx" ON "user_timetable_slot"("class_id");

-- CreateIndex
CREATE INDEX "user_roadmap_entry_course_id_idx" ON "user_roadmap_entry"("course_id");
