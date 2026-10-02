-- CreateIndex
CREATE INDEX "review_events_review_id_event_type_idx" ON "review_events"("review_id", "event_type");
