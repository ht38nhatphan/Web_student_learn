-- ============================================================
-- MIGRATION: Tạo bảng lesson_gifs + Storage bucket cho GIF
-- Chạy trên Supabase SQL Editor
-- ============================================================

-- 1. Tạo bảng lesson_gifs
CREATE TABLE IF NOT EXISTS lesson_gifs (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lesson_id     TEXT REFERENCES lessons(id) ON DELETE CASCADE,
  challenge_id  TEXT REFERENCES challenges(id) ON DELETE CASCADE,
  question_type TEXT,           -- 'multiplechoice' | 'fillblank' | 'matchword' | 'reorder' | 'truefalse' | 'typing' | null (dùng chung)
  label         TEXT,           -- Tên hiển thị (vd: "Bài 1 - Trắc nghiệm")
  storage_path  TEXT NOT NULL,  -- Path trong Storage bucket: "lesson-gifs/abc.gif"
  url           TEXT,           -- Public URL đầy đủ (cache lại cho tiện)
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Index để query nhanh theo lesson/challenge
CREATE INDEX IF NOT EXISTS idx_lesson_gifs_lesson_id    ON lesson_gifs(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_gifs_challenge_id ON lesson_gifs(challenge_id);
CREATE INDEX IF NOT EXISTS idx_lesson_gifs_type         ON lesson_gifs(question_type);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_lesson_gifs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lesson_gifs_updated_at ON lesson_gifs;
CREATE TRIGGER trg_lesson_gifs_updated_at
  BEFORE UPDATE ON lesson_gifs
  FOR EACH ROW EXECUTE FUNCTION update_lesson_gifs_updated_at();

-- 2. Row Level Security (RLS)
ALTER TABLE lesson_gifs ENABLE ROW LEVEL SECURITY;

-- Cho phép tất cả đọc và ghi (anon key — giống bảng lessons/challenges/questions)
CREATE POLICY "lesson_gifs: public all"
  ON lesson_gifs FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Thêm cột updated_at vào bảng users (nếu chưa có)
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Auto-update updated_at cho users
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

-- ============================================================
-- STORAGE BUCKET: lesson-gifs
-- Chạy lệnh sau hoặc tạo thủ công trong Supabase Dashboard
-- Storage → New bucket → Name: "lesson-gifs" → Public: YES
-- ============================================================

-- Tạo bucket qua SQL (Supabase storage schema)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-gifs',
  'lesson-gifs',
  true,                          -- Public bucket
  5242880,                       -- Max 5MB mỗi file
  ARRAY['image/gif', 'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/gif', 'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

-- Storage policies cho bucket lesson-gifs
-- Cho phép tất cả đọc file (học sinh xem ảnh)
CREATE POLICY "lesson-gifs: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lesson-gifs');

-- Cho phép tất cả upload/xóa (anon key — app dùng anon key)
CREATE POLICY "lesson-gifs: public insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lesson-gifs');

CREATE POLICY "lesson-gifs: public delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lesson-gifs');

CREATE POLICY "lesson-gifs: public update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'lesson-gifs');
