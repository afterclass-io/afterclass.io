UPDATE user_bid SET status = 'DROPPED' WHERE status::text = 'MISSED';

CREATE TYPE "UserBidStatus_new" AS ENUM ('PLANNED', 'SECURED', 'DROPPED', 'CANCELLED', 'PARTICIPATED');
ALTER TABLE public.user_bid ALTER COLUMN status DROP DEFAULT;
ALTER TABLE user_bid ALTER COLUMN status TYPE "UserBidStatus_new" USING (status::text::"UserBidStatus_new");
ALTER TYPE "UserBidStatus" RENAME TO "UserBidStatus_old";
ALTER TYPE "UserBidStatus_new" RENAME TO "UserBidStatus";
DROP TYPE public."UserBidStatus_old";
ALTER TABLE user_bid ALTER COLUMN status SET DEFAULT 'PLANNED';

-- Clean up orphaned usage records before adding foreign key
DELETE FROM chat_usage WHERE user_id NOT IN (SELECT id FROM users);

-- AddForeignKey
ALTER TABLE chat_usage ADD CONSTRAINT chat_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
