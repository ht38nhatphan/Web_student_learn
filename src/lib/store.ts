import { GameDef, User, ChallengeDef } from '../types';
import { AppData } from '../data/content';

// ─── API helpers (ghi/đọc trực tiếp JSON qua Express server) ──────────────

async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`GET ${endpoint} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPost(endpoint: string, data: unknown): Promise<void> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`POST ${endpoint} failed: ${res.status}`);
}

// ─── localStorage helpers (CHỈ dùng cho dữ liệu runtime: stars, progress) ──

export function getStoreData<T>(key: string, defaultValue: T): T {
  const data = localStorage.getItem(key);
  if (data) {
    try { return JSON.parse(data) as T; } catch { return defaultValue; }
  }
  return defaultValue;
}

export function setStoreData<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── In-memory cache (populated on app start via loadAllData) ─────────────

let _games: GameDef[] = [];
let _challenges: ChallengeDef[] = [];
let _users: User[] = [];
let _questions: Pick<AppData, 'fillblank' | 'matchword' | 'multiplechoice' | 'reorder' | 'truefalse' | 'typing'> = {
  fillblank: {}, matchword: {}, multiplechoice: {}, reorder: {}, truefalse: {}, typing: {}
};

/** Gọi 1 lần khi app khởi động — load tất cả JSON từ server */
export async function loadAllData(): Promise<void> {
  const [games, challenges, users, questions] = await Promise.all([
    apiGet<GameDef[]>('/api/lessons'),
    apiGet<ChallengeDef[]>('/api/challenges'),
    apiGet<User[]>('/api/users'),
    apiGet<typeof _questions>('/api/questions'),
  ]);
  _games      = games;
  _challenges = challenges;
  _users      = users;
  _questions  = questions;
}

// ─── Games / Lessons ───────────────────────────────────────────────────────

export function getGames(): GameDef[] {
  return _games;
}

export async function saveGames(games: GameDef[]): Promise<void> {
  _games = games;
  await apiPost('/api/lessons', games);
}

// ─── App Content (questions + challenges) ─────────────────────────────────

export function getAppContent(): AppData {
  return {
    lessons: _games,
    challenges: _challenges,
    fillblank:      _questions.fillblank      as AppData['fillblank'],
    matchword:      _questions.matchword      as AppData['matchword'],
    multiplechoice: _questions.multiplechoice as AppData['multiplechoice'],
    reorder:        _questions.reorder        as AppData['reorder'],
    truefalse:      _questions.truefalse      as AppData['truefalse'],
    typing:         _questions.typing         as AppData['typing'],
  };
}

export async function saveAppContent(data: AppData): Promise<void> {
  _challenges = data.challenges;
  _questions = {
    fillblank:      data.fillblank,
    matchword:      data.matchword as any,
    multiplechoice: data.multiplechoice,
    reorder:        data.reorder,
    truefalse:      data.truefalse,
    typing:         data.typing,
  };
  await Promise.all([
    apiPost('/api/challenges', data.challenges),
    apiPost('/api/questions', _questions),
  ]);
}

// ─── Users ─────────────────────────────────────────────────────────────────

export function getUsers(): User[] {
  return _users;
}

export async function saveUsers(users: User[]): Promise<void> {
  _users = users;
  await apiPost('/api/users', users);
}
