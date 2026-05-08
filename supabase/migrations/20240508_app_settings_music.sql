-- ═══════════════════════════════════════════════════════════════════════
-- Migration: App Settings + Music Tracks
-- Chạy trong Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. Bảng app_settings (key-value cho toàn app) ──────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all on app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- Seed giá trị mặc định
INSERT INTO app_settings (key, value) VALUES
  ('weather', '{"type": "none", "enabled": false}'),
  ('music',   '{"enabled": false, "volume": 0.5, "track_id": null}')
ON CONFLICT (key) DO NOTHING;

-- ─── 2. Bảng music_tracks (nhạc nền upload) ─────────────────────────────
CREATE TABLE IF NOT EXISTS music_tracks (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  label        TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  url          TEXT NOT NULL,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all on music_tracks" ON music_tracks FOR ALL USING (true) WITH CHECK (true);

-- ─── 3. Storage bucket cho nhạc nền ─────────────────────────────────────
-- Chạy lệnh này trong Supabase Dashboard → Storage → New Bucket
-- Tên bucket: "music", Public: true
-- Hoặc dùng SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('music', 'music', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read music" ON storage.objects FOR SELECT USING (bucket_id = 'music');
CREATE POLICY "Public upload music" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'music');
CREATE POLICY "Public delete music" ON storage.objects FOR DELETE USING (bucket_id = 'music');

-- ─── 4. Storage bucket cho ảnh nền ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read backgrounds" ON storage.objects FOR SELECT USING (bucket_id = 'backgrounds');
CREATE POLICY "Public upload backgrounds" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'backgrounds');
CREATE POLICY "Public delete backgrounds" ON storage.objects FOR DELETE USING (bucket_id = 'backgrounds');

SELECT 'Migration app_settings + music_tracks + backgrounds hoàn thành ✅' AS status;
