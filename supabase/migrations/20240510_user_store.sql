-- Migration: Add user_store table for syncing user progress and local states
CREATE TABLE IF NOT EXISTS user_store (
  user_id text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

-- Enable real-time for user_store so teachers can see progress live if needed
ALTER TABLE user_store REPLICA IDENTITY FULL;

-- Note: Ensure you have a FOREIGN KEY to users if your users table has text id:
-- ALTER TABLE user_store ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
