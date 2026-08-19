-- AlterEnum
ALTER TYPE "UserBidStatus" ADD VALUE 'PARTICIPATED';

-- AlterTable
ALTER TABLE "user_roadmap" ADD COLUMN "upvote_count" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing counts
UPDATE "user_roadmap" r SET "upvote_count" = (
  SELECT COUNT(*) FROM "roadmap_vote" v WHERE v."roadmap_id" = r."id" AND v."weight" = 1
);

CREATE OR REPLACE FUNCTION update_roadmap_upvote_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "user_roadmap" SET "upvote_count" = "upvote_count" + (CASE WHEN NEW."weight"=1 THEN 1 ELSE 0 END) WHERE "id" = NEW."roadmap_id";
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD."weight" IS DISTINCT FROM NEW."weight" THEN
      UPDATE "user_roadmap" SET "upvote_count" = "upvote_count"
        + (CASE WHEN NEW."weight"=1 THEN 1 ELSE 0 END)
        - (CASE WHEN OLD."weight"=1 THEN 1 ELSE 0 END)
      WHERE "id" = NEW."roadmap_id";
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN  -- defensive; unvote is weight=0, not DELETE
    UPDATE "user_roadmap" SET "upvote_count" = "upvote_count" - (CASE WHEN OLD."weight"=1 THEN 1 ELSE 0 END) WHERE "id" = OLD."roadmap_id";
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER roadmap_upvote_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "roadmap_vote"
  FOR EACH ROW EXECUTE FUNCTION update_roadmap_upvote_count();

CREATE UNIQUE INDEX "user_timetable_one_active_per_term"
  ON "user_timetable"("user_id", "acad_term_id") WHERE "is_active" = true;
