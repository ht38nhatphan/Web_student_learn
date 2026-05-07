



-- ─── 2. Thử thách (Challenge) ─────────────────────────────────────────────────

INSERT INTO challenges (id, lesson_id, title, sort_order)
VALUES (
  'challenge-mau-01',
  'lesson-mau-01',
  'BÀI HỌC',
  0
)
ON CONFLICT (id) DO UPDATE
  SET title = EXCLUDED.title;

-- ─── 3. Câu hỏi – 6 loại ─────────────────────────────────────────────────────
-- Cột "data" chứa JSON theo đúng interface từng loại (xem src/data/content.ts)

-- ╔═══════════════════════════════════════════════════════╗
-- ║  Loại 1: fillblank  (Điền từ vào chỗ trống)          ║
-- ╚═══════════════════════════════════════════════════════╝
-- Interface: { id, sentenceBefore, sentenceAfter, options[], answer }
INSERT INTO questions (id, challenge_id, type, data, sort_order)
VALUES (
  'q-mau-fillblank-01',
  'challenge-mau-01',
  'fillblank',
  '{
    "id": "q-mau-fillblank-01",
    "sentenceBefore": "Con",
    "sentenceAfter": "đang gặm cỏ trên đồng.",
    "options": ["bò", "cá", "chim", "mèo"],
    "answer": "bò"
  }',
  0
)
ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, sort_order = EXCLUDED.sort_order;

-- ╔═══════════════════════════════════════════════════════╗
-- ║  Loại 2: matchword  (Nối từ)                         ║
-- ╚═══════════════════════════════════════════════════════╝
-- Interface: [{ id, left, right }, ...]  — lưu dạng mảng các cặp
-- Một câu nối từ = MỘT mảng nhiều cặp { left, right }
INSERT INTO questions (id, challenge_id, type, data, sort_order)
VALUES (
  'q-mau-matchword-01',
  'challenge-mau-01',
  'matchword',
  '[
    { "id": "pair-1", "left": "con mèo",  "right": "kêu meo meo" },
    { "id": "pair-2", "left": "con chó",  "right": "sủa gâu gâu" },
    { "id": "pair-3", "left": "con gà",   "right": "gáy ò ó o"   },
    { "id": "pair-4", "left": "con vịt",  "right": "kêu cạc cạc" }
  ]',
  1
)
ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, sort_order = EXCLUDED.sort_order;

-- ╔═══════════════════════════════════════════════════════╗
-- ║  Loại 3: multiplechoice  (Trắc nghiệm)              ║
-- ╚═══════════════════════════════════════════════════════╝
-- Interface: { id, question, options[], answer }
INSERT INTO questions (id, challenge_id, type, data, sort_order)
VALUES (
  'q-mau-multiplechoice-01',
  'challenge-mau-01',
  'multiplechoice',
  '{
    "id": "q-mau-multiplechoice-01",
    "question": "Chữ nào dưới đây viết ĐÚNG chính tả?",
    "options": ["quả xoài", "quả soài", "quả xoai", "quã xoài"],
    "answer": "quả xoài"
  }',
  2
)
ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, sort_order = EXCLUDED.sort_order;

-- ╔═══════════════════════════════════════════════════════╗
-- ║  Loại 4: reorder  (Sắp xếp từ thành câu)            ║
-- ╚═══════════════════════════════════════════════════════╝
-- Interface: { id, words[], correctOrder[] }
-- words = danh sách từ bị xáo trộn, correctOrder = thứ tự đúng
INSERT INTO questions (id, challenge_id, type, data, sort_order)
VALUES (
  'q-mau-reorder-01',
  'challenge-mau-01',
  'reorder',
  '{
    "id": "q-mau-reorder-01",
    "words":        ["học", "Em", "chăm", "bài", "rất"],
    "correctOrder": ["Em", "học", "bài", "rất", "chăm"]
  }',
  3
)
ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, sort_order = EXCLUDED.sort_order;

-- ╔═══════════════════════════════════════════════════════╗
-- ║  Loại 5: truefalse  (Đúng / Sai)                    ║
-- ╚═══════════════════════════════════════════════════════╝
-- Interface: { id, statement, isTrue }
INSERT INTO questions (id, challenge_id, type, data, sort_order)
VALUES (
  'q-mau-truefalse-01',
  'challenge-mau-01',
  'truefalse',
  '{
    "id": "q-mau-truefalse-01",
    "statement": "Trong tiếng Việt, chữ \"d\" và \"gi\" đều có thể đứng đầu một từ.",
    "isTrue": true
  }',
  4
)
ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, sort_order = EXCLUDED.sort_order;

-- ╔═══════════════════════════════════════════════════════╗
-- ║  Loại 6: typing  (Gõ từ)                            ║
-- ╚═══════════════════════════════════════════════════════╝
-- Interface: { id, word, hint }
INSERT INTO questions (id, challenge_id, type, data, sort_order)
VALUES (
  'q-mau-typing-01',
  'challenge-mau-01',
  'typing',
  '{
    "id": "q-mau-typing-01",
    "word": "bướm",
    "hint": "Con vật có cánh đẹp, bay lượn trên hoa 🦋"
  }',
  5
)
ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, sort_order = EXCLUDED.sort_order;

-- ─── Xác nhận ─────────────────────────────────────────────────────────────────
SELECT
  q.id,
  q.type,
  q.sort_order,
  c.title AS challenge_title,
  l.title AS lesson_title
FROM questions q
JOIN challenges c ON c.id = q.challenge_id
JOIN lessons    l ON l.id = c.lesson_id
WHERE l.id = 'lesson-mau-01'
ORDER BY q.sort_order;
