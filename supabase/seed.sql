-- ═══════════════════════════════════════════════════════════════════════════
-- SUPABASE SCHEMA + SEED cho "Học Vui Tiếng Việt 2"
-- Chạy file này trong Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Tạo bảng ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lessons (
  id           TEXT        PRIMARY KEY,
  title        TEXT        NOT NULL,
  description  TEXT        DEFAULT '',
  type         TEXT        DEFAULT 'fillblank',
  icon         TEXT        DEFAULT '📚',
  theme        TEXT        DEFAULT 'blue',
  is_active    BOOLEAN     DEFAULT TRUE,
  sort_order   INTEGER     DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenges (
  id           TEXT        PRIMARY KEY,
  lesson_id    TEXT        REFERENCES lessons(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  sort_order   INTEGER     DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id           TEXT        PRIMARY KEY,
  challenge_id TEXT        REFERENCES challenges(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL,
  data         JSONB       NOT NULL,
  sort_order   INTEGER     DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id           TEXT        PRIMARY KEY,
  name         TEXT        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'student',
  avatar       TEXT        DEFAULT '👤',
  color        TEXT        DEFAULT 'bg-blue-100 border-blue-400 text-blue-700',
  stars        INTEGER     DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Row Level Security (cho phép đọc/ghi không cần auth) ─────────────────

ALTER TABLE lessons    ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE users      ENABLE ROW LEVEL SECURITY;

-- Public read + write (anon key)
CREATE POLICY "Public all on lessons"    ON lessons    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public all on challenges" ON challenges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public all on questions"  ON questions  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public all on users"      ON users      FOR ALL USING (true) WITH CHECK (true);

-- ─── 3. Seed dữ liệu Users ───────────────────────────────────────────────────

INSERT INTO users (id, name, role, avatar, color, stars) VALUES
  ('t1', 'Cô Mai',     'teacher', '👩‍🏫', 'bg-purple-100 border-purple-400 text-purple-700', 0),
  ('s1', 'Nguyễn An',  'student', '👦🏻', 'bg-blue-100 border-blue-400 text-blue-700',       1250),
  ('s2', 'Trần Bình',  'student', '👦🏽', 'bg-green-100 border-green-400 text-green-700',    980),
  ('s3', 'Lê Chi',     'student', '👧🏻', 'bg-orange-100 border-orange-400 text-orange-700', 1420),
  ('s4', 'Phạm Duy',   'student', '👦🏼', 'bg-red-100 border-red-400 text-red-700',          850),
  ('s5', 'Hoàng Yến',  'student', '👧🏽', 'bg-pink-100 border-pink-400 text-pink-700',       1100)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, avatar = EXCLUDED.avatar,
  color = EXCLUDED.color, stars = EXCLUDED.stars;

-- ─── 4. Seed Lessons (50 bài học) ────────────────────────────────────────────

INSERT INTO lessons (id, title, description, type, icon, theme, is_active, sort_order) VALUES
  ('g1',  'Điền chữ c/k',           'Phân biệt âm c và k',                  'fillblank',      '📝', 'blue',   true,  0),
  ('g2',  'Điền chữ g/gh',          'Phân biệt âm g và gh',                 'fillblank',      '📝', 'blue',   true,  1),
  ('g3',  'Điền chữ ng/ngh',        'Phân biệt ng và ngh',                  'fillblank',      '📝', 'blue',   true,  2),
  ('g4',  'Nối từ trường học',       'Nối từ theo chủ đề trường học',         'matchword',      '🔗', 'orange', true,  3),
  ('g5',  'Nối từ gia đình',         'Nối từ theo chủ đề gia đình',           'matchword',      '🔗', 'orange', true,  4),
  ('g6',  'Đọc hiểu: Ngày khai trường', 'Trắc nghiệm đọc hiểu',             'multiplechoice', '📖', 'green',  true,  5),
  ('g7',  'Sắp xếp câu: Ai là gì?', 'Sắp xếp từ thành câu đúng',            'reorder',        '🔤', 'purple', true,  6),
  ('g8',  'Sắp xếp câu: Ai làm gì?','Sắp xếp từ thành câu đúng',            'reorder',        '🔤', 'purple', true,  7),
  ('g9',  'Sắp xếp câu: Ai thế nào?','Sắp xếp từ thành câu đúng',           'reorder',        '🔤', 'purple', true,  8),
  ('g10', 'Nối từ trái nghĩa',       'Nối các cặp từ trái nghĩa',             'matchword',      '🔗', 'orange', true,  9),
  ('g11', 'Nối từ đồng nghĩa',       'Nối các cặp từ đồng nghĩa',             'matchword',      '🔗', 'orange', true,  10),
  ('g12', 'Dấu hỏi / dấu ngã',       'Phân biệt dấu hỏi và dấu ngã',         'fillblank',      '📝', 'blue',   true,  11),
  ('g13', 'Từ chỉ sự vật',           'Nhận biết từ chỉ sự vật',               'multiplechoice', '📖', 'green',  true,  12),
  ('g14', 'Từ chỉ hoạt động',        'Nhận biết từ chỉ hoạt động',            'multiplechoice', '📖', 'green',  true,  13),
  ('g15', 'Biện pháp nhân hóa',      'Phát hiện biện pháp nhân hóa',          'truefalse',      '✅', 'pink',   true,  14),
  ('g16', 'Từ chỉ đặc điểm',         'Tìm từ chỉ đặc điểm',                   'multiplechoice', '📖', 'green',  true,  15),
  ('g17', 'Điền ch/tr',              'Điền ch hoặc tr vào chỗ trống',          'fillblank',      '📝', 'blue',   true,  16),
  ('g18', 'Điền s/x',                'Điền s hoặc x vào chỗ trống',            'fillblank',      '📝', 'blue',   true,  17),
  ('g19', 'Dấu câu',                 'Chọn dấu câu thích hợp',                 'multiplechoice', '📖', 'green',  true,  18),
  ('g20', 'Sắp xếp bức thư',         'Sắp xếp thứ tự các phần trong bức thư',  'reorder',        '🔤', 'purple', true,  19),
  ('g21', 'Điền d/gi/r',             'Điền d, gi hoặc r',                       'fillblank',      '📝', 'blue',   true,  20),
  ('g22', 'Phân biệt l/n',           'Phân biệt l và n trong câu',              'fillblank',      '📝', 'blue',   true,  21),
  ('g23', 'Từ chỉ tình cảm',         'Nhận biết từ chỉ tình cảm',               'multiplechoice', '📖', 'green',  true,  22),
  ('g24', 'Tên môn học',             'Ghép tên các môn học',                     'matchword',      '🔗', 'orange', true,  23),
  ('g25', 'Tên các mùa',             'Ghép tên các mùa trong năm',               'matchword',      '🔗', 'orange', true,  24),
  ('g26', 'Sắp xếp câu hoàn chỉnh', 'Sắp xếp thành câu hoàn chỉnh',            'reorder',        '🔤', 'purple', true,  25),
  ('g27', 'Vần ui/uy',               'Phân biệt vần ui và uy',                   'fillblank',      '📝', 'blue',   true,  26),
  ('g28', 'Dấu câu . ? !',           'Chọn dấu câu: . ? !',                      'multiplechoice', '📖', 'green',  true,  27),
  ('g29', 'Đọc hiểu Bài 2',          'Trắc nghiệm đọc hiểu Bài 2',               'multiplechoice', '📖', 'green',  true,  28),
  ('g30', 'Đồ dùng trong nhà',        'Ghép tên đồ dùng trong nhà',               'matchword',      '🔗', 'orange', true,  29),
  ('g31', 'Ải 1 – Rừng Xanh',        'Khám phá Rừng Xanh',                       'multiplechoice', '🏔', 'red',    true,  30),
  ('g32', 'Ải 2 – Đảo Xa',           'Tìm kho báu Đảo Xa',                        'multiplechoice', '🏝', 'red',    true,  31),
  ('g33', 'Ải 3 – Suối Tiên',        'Vượt Suối Tiên',                             'multiplechoice', '🌊', 'red',    true,  32),
  ('g34', 'Ải 4 – Đỉnh Núi',         'Chinh phục Đỉnh Núi',                        'multiplechoice', '🏔', 'red',    true,  33),
  ('g35', 'Ải 5 – Hang Động',         'Giải mã Hang Động',                           'multiplechoice', '🦇', 'red',    true,  34),
  ('g36', 'Ải 6 – Sa Mạc',            'Băng qua Sa Mạc',                              'multiplechoice', '🏜', 'red',    true,  35),
  ('g37', 'Ải 7 – Tuyết Rơi',         'Vượt Tuyết Rơi',                               'multiplechoice', '❄️', 'red',    true,  36),
  ('g38', 'Ải 8 – Bầu Trời',          'Bay trên Bầu Trời',                             'multiplechoice', '☁️', 'red',    true,  37),
  ('g39', 'Ải 9 – Đáy Biển',          'Lặn Đáy Biển',                                  'multiplechoice', '🐋', 'red',    true,  38),
  ('g40', 'Ải 10 – Đồng Cỏ',          'Dạo Đồng Cỏ xanh',                               'multiplechoice', '🌿', 'red',    true,  39),
  ('g41', 'Ải 11 – Lâu Đài',          'Phá cổng Lâu Đài',                               'multiplechoice', '🏰', 'red',    true,  40),
  ('g42', 'Ải 12 – Trang Trại',       'Thăm Trang Trại',                                 'multiplechoice', '🐄', 'red',    true,  41),
  ('g43', 'Ải 13 – Chim Cánh Cụt',    'Cùng Chim Cánh Cụt',                              'multiplechoice', '🐧', 'red',    true,  42),
  ('g44', 'Ải 14 – Núi Lửa',          'Thoát Núi Lửa',                                   'multiplechoice', '🌋', 'red',    true,  43),
  ('g45', 'Ải 15 – Thành Phố',        'Dạo phố Thành Phố',                               'multiplechoice', '🏙', 'red',    true,  44),
  ('g46', 'Ải 16 – Hái sao',          'Hái sao trên trời',                                'multiplechoice', '⭐', 'red',    true,  45),
  ('g47', 'Ải 17 – Vũ Trụ',           'Du hành Vũ Trụ',                                   'multiplechoice', '🚀', 'red',    true,  46),
  ('g48', 'Ải 18 – Rừng Mưa',         'Vượt Rừng Mưa',                                    'multiplechoice', '🌧', 'red',    true,  47),
  ('g49', 'Ải 19 – Nông Thôn',        'Thăm Nông Thôn',                                   'multiplechoice', '🌾', 'red',    true,  48),
  ('g50', 'Ải 20 – Về Đích! 🏆',      'Chặng cuối hành trình',                             'multiplechoice', '🏆', 'red',    true,  49)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description,
  icon = EXCLUDED.icon, theme = EXCLUDED.theme, is_active = EXCLUDED.is_active;

-- ─── 5. Seed Challenges ────────────────────────────────────────────────────────

INSERT INTO challenges (id, lesson_id, title, sort_order) VALUES
  ('g1',  'g1',  'Luyện c/k: Điền âm đầu đúng',              0),
  ('g2',  'g2',  'Luyện g/gh: Chọn phụ âm phù hợp',          0),
  ('g3',  'g3',  'Luyện ng/ngh: Nghe và điền',                0),
  ('g4',  'g4',  'Nối từ về trường học',                       0),
  ('g5',  'g5',  'Ghép từ về gia đình',                        0),
  ('g6',  'g6',  'Trắc nghiệm đọc hiểu: Ngày khai trường',    0),
  ('g7',  'g7',  'Sắp xếp câu: Ai là gì?',                    0),
  ('g8',  'g8',  'Sắp xếp câu: Ai làm gì?',                   0),
  ('g9',  'g9',  'Sắp xếp câu: Ai thế nào?',                  0),
  ('g10', 'g10', 'Nối từ trái nghĩa',                          0),
  ('g11', 'g11', 'Nối từ đồng nghĩa',                          0),
  ('g12', 'g12', 'Phân biệt dấu hỏi và dấu ngã',              0),
  ('g13', 'g13', 'Nhận biết từ chỉ sự vật',                   0),
  ('g14', 'g14', 'Nhận biết từ chỉ hoạt động',                 0),
  ('g15', 'g15', 'Phát hiện biện pháp nhân hóa',               0),
  ('g16', 'g16', 'Tìm từ chỉ đặc điểm',                        0),
  ('g17', 'g17', 'Điền ch hoặc tr vào chỗ trống',              0),
  ('g18', 'g18', 'Điền s hoặc x vào chỗ trống',                0),
  ('g19', 'g19', 'Chọn dấu câu thích hợp',                     0),
  ('g20', 'g20', 'Sắp xếp thứ tự bức thư',                     0),
  ('g21', 'g21', 'Điền d, gi hoặc r',                           0),
  ('g22', 'g22', 'Phân biệt l và n trong câu',                  0),
  ('g23', 'g23', 'Nhận biết từ chỉ tình cảm',                   0),
  ('g24', 'g24', 'Ghép tên các môn học',                         0),
  ('g25', 'g25', 'Ghép tên các mùa trong năm',                   0),
  ('g26', 'g26', 'Sắp xếp thành câu hoàn chỉnh',                 0),
  ('g27', 'g27', 'Phân biệt vần ui và uy',                        0),
  ('g28', 'g28', 'Chọn dấu câu: . ? !',                           0),
  ('g29', 'g29', 'Trắc nghiệm đọc hiểu Bài 2',                    0),
  ('g30', 'g30', 'Ghép tên đồ dùng trong nhà',                     0),
  ('g31', 'g31', 'Ải 1 – Khám phá Rừng Xanh',                     0),
  ('g32', 'g32', 'Ải 2 – Tìm kho báu Đảo Xa',                     0),
  ('g33', 'g33', 'Ải 3 – Vượt Suối Tiên',                         0),
  ('g34', 'g34', 'Ải 4 – Chinh phục Đỉnh Núi',                    0),
  ('g35', 'g35', 'Ải 5 – Giải mã Hang Động',                       0),
  ('g36', 'g36', 'Ải 6 – Băng qua Sa Mạc',                         0),
  ('g37', 'g37', 'Ải 7 – Vượt Tuyết Rơi',                         0),
  ('g38', 'g38', 'Ải 8 – Bay trên Bầu Trời',                       0),
  ('g39', 'g39', 'Ải 9 – Lặn Đáy Biển',                           0),
  ('g40', 'g40', 'Ải 10 – Dạo Đồng Cỏ xanh',                      0),
  ('g41', 'g41', 'Ải 11 – Phá cổng Lâu Đài',                       0),
  ('g42', 'g42', 'Ải 12 – Thăm Trang Trại',                         0),
  ('g43', 'g43', 'Ải 13 – Cùng Chim Cánh Cụt',                      0),
  ('g44', 'g44', 'Ải 14 – Thoát Núi Lửa',                           0),
  ('g45', 'g45', 'Ải 15 – Dạo phố Thành Phố',                       0),
  ('g46', 'g46', 'Ải 16 – Hái sao trên trời',                        0),
  ('g47', 'g47', 'Ải 17 – Du hành Vũ Trụ',                          0),
  ('g48', 'g48', 'Ải 18 – Vượt Rừng Mưa',                           0),
  ('g49', 'g49', 'Ải 19 – Thăm Nông Thôn',                          0),
  ('g50', 'g50', 'Ải 20 – Về Đích! 🏆',                             0)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- ─── Lưu ý: Câu hỏi sẽ được nhập qua giao diện giáo viên trong app ─────────
-- Hoặc export từ questions.json bằng script riêng

SELECT 'Seed hoàn thành! ✅' AS status;
