/*
  Warnings:

  - The primary key for the `review_votes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `review_votes` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "review_votes_review_id_idx";

-- AlterTable
ALTER TABLE "review_votes" DROP CONSTRAINT "review_votes_pkey",
DROP COLUMN "id",
ADD COLUMN     "weight" SMALLINT NOT NULL DEFAULT 1,
ADD CONSTRAINT "review_votes_pkey" PRIMARY KEY ("review_id", "voter_id");

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "count_event_views" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "count_votes" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "review_votes_review_id_voter_id_idx" ON "review_votes"("review_id", "voter_id");


-- =================================================== --
-- BELOW IS NOT DONE BY PRISMA, THIS IS MANUALLY ADDED --
-- =================================================== --
-- Function to update the review view count
CREATE FUNCTION increment_review_view_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process VIEW events
    IF NEW.event_type = 'VIEW' THEN
        -- Update the count_event_views in the reviews table
        UPDATE reviews
        SET count_event_views = count_event_views + 1
        WHERE id = NEW.review_id;
    END IF;
    
    -- Return the new row to complete the trigger
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update the review view count
CREATE TRIGGER increment_review_view_count_trigger
    AFTER INSERT ON review_events
    FOR EACH ROW
    EXECUTE FUNCTION increment_review_view_count();

-- Function to reset/recalculate view counts, if needed
CREATE FUNCTION recalculate_review_view_counts()
RETURNS void AS $$
BEGIN
    UPDATE reviews r
    SET count_event_views = (
        SELECT COUNT(*)
        FROM review_events re
        WHERE re.review_id = r.id
        AND re.event_type = 'VIEW'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update review vote count
CREATE FUNCTION update_review_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT, add the new weight
    -- For UPDATE, subtract old weight and add new weight
    UPDATE reviews
    SET count_votes = CASE 
        WHEN TG_OP = 'INSERT' THEN count_votes + NEW.weight
        WHEN TG_OP = 'UPDATE' THEN count_votes - OLD.weight + NEW.weight
    END
    WHERE id = NEW.review_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER update_review_vote_count_trigger
    AFTER INSERT OR UPDATE ON review_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_review_vote_count();

-- Function to reset/recalculate all vote counts, if needed
CREATE FUNCTION recalculate_review_vote_counts()
RETURNS void AS $$
BEGIN
    UPDATE reviews r
    SET count_votes = (
        SELECT COALESCE(SUM(weight), 0)
        FROM review_votes rv
        WHERE rv.review_id = r.id
    );
END;
$$ LANGUAGE plpgsql;
