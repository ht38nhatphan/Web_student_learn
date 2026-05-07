/**
 * API Server - ghi dữ liệu trực tiếp vào file JSON
 * Chạy song song với Vite dev server
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'src', 'data');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Cho phép CORS từ Vite dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  next();
});

/** Đọc file JSON */
function readJson(filename: string) {
  const filePath = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/** Ghi file JSON (format đẹp) */
function writeJson(filename: string, data: unknown) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── GET endpoints ────────────────────────────────────────────────
app.get('/api/users',      (_, res) => res.json(readJson('users.json')));
app.get('/api/lessons',    (_, res) => res.json(readJson('lessons.json')));
app.get('/api/challenges', (_, res) => res.json(readJson('challenges.json')));
app.get('/api/questions',  (_, res) => res.json(readJson('questions.json')));

// ─── POST (save) endpoints ────────────────────────────────────────
app.post('/api/users', (req, res) => {
  try {
    writeJson('users.json', req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/lessons', (req, res) => {
  try {
    writeJson('lessons.json', req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/challenges', (req, res) => {
  try {
    writeJson('challenges.json', req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/questions', (req, res) => {
  try {
    writeJson('questions.json', req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ API Server chạy tại http://localhost:${PORT}`);
});
