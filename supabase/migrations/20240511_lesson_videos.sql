-- Create the videos bucket if it doesn't exist with a large file size limit (500MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'videos', 
  'videos', 
  true,
  524288000,
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];

-- Drop old restricted policies if they exist
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow All Upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow All Delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow All Update" ON storage.objects;

-- Allow public access to read videos
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'videos');

-- Allow ANYONE (including anon users) to upload videos
CREATE POLICY "Allow All Upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'videos');

-- Allow ANYONE to delete videos
CREATE POLICY "Allow All Delete" ON storage.objects
FOR DELETE USING (bucket_id = 'videos');

-- Allow ANYONE to update videos
CREATE POLICY "Allow All Update" ON storage.objects
FOR UPDATE USING (bucket_id = 'videos');

-- Add video_url column to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url text;
