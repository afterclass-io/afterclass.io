-- Clean up orphaned usage records before adding foreign key
DELETE FROM chat_usage WHERE user_id NOT IN (SELECT id FROM users);

-- AddForeignKey
ALTER TABLE chat_usage ADD CONSTRAINT chat_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
