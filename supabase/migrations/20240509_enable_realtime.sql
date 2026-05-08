-- Enable Realtime for app_settings and content tables
-- Run this in Supabase SQL Editor

-- 1. app_settings: cần REPLICA IDENTITY FULL để nhận UPDATE events
ALTER TABLE IF EXISTS app_settings REPLICA IDENTITY FULL;

-- 2. Content tables
ALTER TABLE IF EXISTS lessons    REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS challenges REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS questions  REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS users      REPLICA IDENTITY FULL;

-- 3. Thêm vào publication realtime (nếu chưa có)
DO $$
BEGIN
  -- app_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'app_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;
  END IF;

  -- lessons
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'lessons'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lessons;
  END IF;

  -- challenges
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'challenges'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE challenges;
  END IF;

  -- questions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'questions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE questions;
  END IF;
END $$;
