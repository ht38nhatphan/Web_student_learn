import { supabase } from './supabase';
import { GameDef, User, ChallengeDef } from '../types';
import { AppData } from '../data/content';

// Fallback data từ JSON (khi Supabase trống)
import lessonsJson    from '../data/lessons.json';
import challengesJson from '../data/challenges.json';
import questionsJson  from '../data/questions.json';
import usersJson      from '../data/users.json';

// ─── localStorage helpers (CHỈ cho runtime: stars, session) ──────────────────

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

// ─── In-memory cache ──────────────────────────────────────────────────────────

let _games: GameDef[] = [];
let _challenges: ChallengeDef[] = [];
let _users: User[] = [];
let _questions: Pick<AppData, 'fillblank' | 'matchword' | 'multiplechoice' | 'reorder' | 'truefalse' | 'typing'> = {
  fillblank: {}, matchword: {} as any, multiplechoice: {}, reorder: {}, truefalse: {}, typing: {}
};

// ─── Load tất cả dữ liệu từ Supabase khi app khởi động ───────────────────────

export async function loadAllData(): Promise<void> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Supabase timeout sau 8 giây')), 8000)
  );

  const [
    { data: lessonsData,    error: le },
    { data: challengesData, error: ce },
    { data: usersData,      error: ue },
    { data: questionsData,  error: qe },
  ] = await Promise.race([
    Promise.all([
      supabase.from('lessons').select('*').order('sort_order'),
      supabase.from('challenges').select('*').order('sort_order'),
      supabase.from('users').select('*').order('created_at'),
      supabase.from('questions').select('*').order('sort_order'),
    ]),
    timeout,
  ]);

  if (le) console.error('Lỗi load lessons:',    le.message);
  if (ce) console.error('Lỗi load challenges:', ce.message);
  if (ue) console.error('Lỗi load users:',      ue.message);
  if (qe) console.error('Lỗi load questions:',  qe.message);

  const supabaseIsEmpty = !lessonsData || lessonsData.length === 0;

  if (supabaseIsEmpty) {
    // ── Lần đầu: Supabase trống → tự động seed từ JSON ──────────────────────
    console.info('🌱 Supabase trống. Đang tự động seed dữ liệu từ JSON...');
    _games      = lessonsJson      as GameDef[];
    _challenges = challengesJson   as ChallengeDef[];
    _users      = usersJson        as User[];
    const qj    = questionsJson    as any;
    _questions  = {
      fillblank:      qj.fillblank      || {},
      matchword:      qj.matchword      || {},
      multiplechoice: qj.multiplechoice || {},
      reorder:        qj.reorder        || {},
      truefalse:      qj.truefalse      || {},
      typing:         qj.typing         || {},
    };

    // Seed lên Supabase theo thứ tự FK: lessons → users → challenges → questions
    try {
      // 1. Lessons
      const lessonRows = _games.map((g, i) => ({
        id: g.id, title: g.title, description: g.description,
        type: g.type, icon: g.icon, theme: g.theme,
        is_active: g.isActive ?? true, sort_order: i,
      }));
      await supabase.from('lessons').upsert(lessonRows, { onConflict: 'id' });

      // 2. Users
      const userRows = _users.map(u => ({
        id: u.id, name: u.name, role: u.role,
        avatar: u.avatar, color: u.color, stars: u.stars ?? 0,
      }));
      await supabase.from('users').upsert(userRows, { onConflict: 'id' });

      // 3. Challenges (sau lessons vì có FK)
      const challengeRows = _challenges.map((c, i) => ({
        id: c.id, lesson_id: c.lessonId, title: c.title, sort_order: i,
      }));
      await supabase.from('challenges').upsert(challengeRows, { onConflict: 'id' });

      // 4. Questions (sau challenges vì có FK)
      const questionTypes = ['fillblank', 'matchword', 'multiplechoice', 'reorder', 'truefalse', 'typing'] as const;
      const allQRows: any[] = [];
      for (const type of questionTypes) {
        const byChallenge = (_questions[type] as Record<string, any[]>) || {};
        for (const [cid, qs] of Object.entries(byChallenge)) {
          qs.forEach((q: any, i: number) => {
            if (q?.id) allQRows.push({ id: q.id, challenge_id: cid, type, data: q, sort_order: i });
          });
        }
      }
      if (allQRows.length > 0) {
        await supabase.from('questions').upsert(allQRows, { onConflict: 'id' });
      }
      console.info('✅ Seed hoàn thành! Supabase đã có đầy đủ dữ liệu.');
    } catch (err) {
      console.error('❌ Lỗi seed Supabase:', err);
    }
    return;
  }

  // ── Supabase có dữ liệu → load bình thường ────────────────────────────────
  _games = (lessonsData || []).map(r => ({
    id: r.id, title: r.title, description: r.description,
    type: r.type ?? 'fillblank', icon: r.icon, theme: r.theme, isActive: r.is_active,
  }));

  _challenges = (challengesData || []).map(r => ({
    id: r.id, lessonId: r.lesson_id, title: r.title,
  }));

  _users = (usersData || []).map(r => ({
    id: r.id, name: r.name, role: r.role,
    avatar: r.avatar, color: r.color, stars: r.stars ?? 0,
  }));

  const fb: AppData['fillblank'] = {};
  const mw: any = {};
  const mc: AppData['multiplechoice'] = {};
  const ro: AppData['reorder'] = {};
  const tf: AppData['truefalse'] = {};
  const ty: AppData['typing'] = {};

  for (const q of questionsData || []) {
    const cid = q.challenge_id;
    switch (q.type) {
      case 'fillblank':      if (!fb[cid]) fb[cid] = []; fb[cid].push(q.data); break;
      case 'matchword':      if (!mw[cid]) mw[cid] = []; mw[cid].push(q.data); break;
      case 'multiplechoice': if (!mc[cid]) mc[cid] = []; mc[cid].push(q.data); break;
      case 'reorder':        if (!ro[cid]) ro[cid] = []; ro[cid].push(q.data); break;
      case 'truefalse':      if (!tf[cid]) tf[cid] = []; tf[cid].push(q.data); break;
      case 'typing':         if (!ty[cid]) ty[cid] = []; ty[cid].push(q.data); break;
    }
  }
  _questions = { fillblank: fb, matchword: mw, multiplechoice: mc, reorder: ro, truefalse: tf, typing: ty };
}


// ─── Games / Lessons ──────────────────────────────────────────────────────────

export function getGames(): GameDef[] {
  return _games;
}

export function getChallenges(lessonId?: string): ChallengeDef[] {
  if (!lessonId) return _challenges;
  return _challenges.filter(c => c.lessonId === lessonId);
}

export async function saveGames(games: GameDef[]): Promise<void> {
  if (games.length === 0) return; // ✅ Bảo vệ: không xóa toàn bộ khi array rỗng

  _games = games;
  const rows = games.map((g, i) => ({
    id:          g.id,
    title:       g.title,
    description: g.description,
    type:        g.type,
    icon:        g.icon,
    theme:       g.theme,
    is_active:   g.isActive ?? true,
    sort_order:  i,
  }));

  const { error } = await supabase.from('lessons').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error('Lỗi lưu lessons: ' + error.message);

  // ✅ Xóa bài học bị xóa — dùng array thay vì raw string
  // Chỉ xóa nếu có ít nhất 1 bài học để giữ (tránh xóa sạch)
  const keepIds = games.map(g => g.id);
  if (keepIds.length > 0) {
    // BUG FIX: dùng .not().in() đúng cách với Supabase JS
    const { error: delErr } = await supabase
      .from('lessons')
      .delete()
      .not('id', 'in', `(${keepIds.join(',')})`);
    if (delErr) console.warn('Không xóa được bài học cũ:', delErr.message);
  }
}

// ─── App Content (questions + challenges) ────────────────────────────────────

export function getAppContent(): AppData {
  return {
    lessons:        _games,
    challenges:     _challenges,
    fillblank:      _questions.fillblank      as AppData['fillblank'],
    matchword:      _questions.matchword      as AppData['matchword'],
    multiplechoice: _questions.multiplechoice as AppData['multiplechoice'],
    reorder:        _questions.reorder        as AppData['reorder'],
    truefalse:      _questions.truefalse      as AppData['truefalse'],
    typing:         _questions.typing         as AppData['typing'],
  };
}

/** Xóa 1 thử thách khỏi Supabase (cascade xóa questions) + cập nhật cache */
export async function deleteChallenge(challengeId: string): Promise<void> {
  // Xóa questions của thử thách này trước (nếu không có ON DELETE CASCADE)
  await supabase.from('questions').delete().eq('challenge_id', challengeId);
  // Xóa thử thách
  const { error } = await supabase.from('challenges').delete().eq('id', challengeId);
  if (error) throw new Error('Lỗi xóa thử thách: ' + error.message);
  // Cập nhật cache
  _challenges = _challenges.filter(c => c.id !== challengeId);
}

export async function saveAppContent(data: AppData): Promise<void> {
  _challenges = data.challenges;

  // Upsert challenges — thêm/sửa, KHÔNG auto-delete (dùng deleteChallenge riêng)
  const challengeRows = data.challenges.map((c, i) => ({
    id:         c.id,
    lesson_id:  c.lessonId,
    title:      c.title,
    sort_order: i,
  }));
  if (challengeRows.length > 0) {
    const { error } = await supabase.from('challenges').upsert(challengeRows, { onConflict: 'id' });
    if (error) throw new Error('Lỗi lưu challenges: ' + error.message);
  }

  // Build và upsert questions
  const questionTypes = ['fillblank', 'matchword', 'multiplechoice', 'reorder', 'truefalse', 'typing'] as const;
  const allQuestionRows: any[] = [];

  for (const type of questionTypes) {
    const byChallenge = (data[type] as Record<string, any[]>) || {};
    for (const [challengeId, questions] of Object.entries(byChallenge)) {
      // Chỉ lưu nếu challenge tồn tại trong danh sách hiện tại
      if (!data.challenges.find(c => c.id === challengeId)) continue;
      questions.forEach((q, i) => {
        if (!q?.id) return; // bỏ qua câu hỏi không có ID
        allQuestionRows.push({
          id:           q.id,
          challenge_id: challengeId,
          type,
          data:         q,
          sort_order:   i,
        });
      });
    }
  }

  if (allQuestionRows.length > 0) {
    const { error } = await supabase.from('questions').upsert(allQuestionRows, { onConflict: 'id' });
    if (error) throw new Error('Lỗi lưu questions: ' + error.message);
  }

  // Cập nhật cache
  _questions = {
    fillblank:      data.fillblank,
    matchword:      data.matchword as any,
    multiplechoice: data.multiplechoice,
    reorder:        data.reorder,
    truefalse:      data.truefalse,
    typing:         data.typing,
  };
}


// ─── Users ────────────────────────────────────────────────────────────────────

export function getUsers(): User[] {
  return _users;
}

export async function saveUsers(users: User[]): Promise<void> {
  if (users.length === 0) return;

  _users = users;
  const rows = users.map(u => ({
    id:     u.id,
    name:   u.name,
    role:   u.role,
    avatar: u.avatar,
    color:  u.color,
    stars:  u.stars ?? 0,
  }));

  const { error } = await supabase.from('users').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error('Lỗi lưu users: ' + error.message);

  const keepIds = users.map(u => u.id);
  if (keepIds.length > 0) {
    const { error: delErr } = await supabase
      .from('users')
      .delete()
      .not('id', 'in', `(${keepIds.join(',')})`);
    if (delErr) console.warn('Không xóa được user cũ:', delErr.message);
  }
}

// ─── Callback để App.tsx nhận thông báo khi sao thay đổi ──────────────────────
type StarsChangedCb = (userId: string, newStars: number) => void;
let _onStarsChanged: StarsChangedCb | null = null;
export function onStarsChanged(cb: StarsChangedCb) { _onStarsChanged = cb; }

/**
 * Điểm đến duy nhất để thay đổi số sao học sinh.
 * Optimistic: cập nhật cache ngay → sync Supabase ngầm → rollback nếu lỗi.
 */
export async function awardStars(
  userId: string,
  delta: number,
  reason: string = 'unknown'
): Promise<{ ok: boolean; newStars: number }> {
  const user = _users.find(u => u.id === userId);
  if (!user) return { ok: false, newStars: 0 };

  const oldStars = user.stars ?? 0;
  const newStars = Math.max(0, oldStars + delta);

  // 1. Cập nhật cache ngay (optimistic)
  user.stars = newStars;
  _onStarsChanged?.(userId, newStars);

  // 2. Sync lên Supabase ngầm
  try {
    const { error } = await supabase
      .from('users')
      .update({ stars: newStars })
      .eq('id', userId);

    if (error) throw error;
    return { ok: true, newStars };
  } catch (err) {
    // Rollback nếu Supabase lỗi
    user.stars = oldStars;
    _onStarsChanged?.(userId, oldStars);
    console.error(`awardStars rollback [${reason}]:`, err);
    return { ok: false, newStars: oldStars };
  }
}

/** Load sao của 1 user từ Supabase (gọi khi login) */
export async function fetchUserStars(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('users')
    .select('stars')
    .eq('id', userId)
    .single();
  if (error || !data) return _users.find(u => u.id === userId)?.stars ?? 0;
  // Cập nhật cache
  const user = _users.find(u => u.id === userId);
  if (user) user.stars = data.stars ?? 0;
  return data.stars ?? 0;
}
