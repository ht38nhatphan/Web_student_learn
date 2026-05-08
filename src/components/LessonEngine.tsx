import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, XCircle, CheckCircle2, Home, RotateCcw } from 'lucide-react';
import { FillBlankQuestion, MatchPair, MultipleChoiceQuestion, ReorderQuestion, TrueFalseQuestion, TypingQuestion } from '../data/content';
import { ChallengeDef } from '../types';
import { getAppContent, getStoreData, setStoreData, awardStars, getAppSetting } from '../lib/store';
import { soundManager } from '../lib/sound';
import { supabase } from '../lib/supabase';
import StageBackground, { getPresetTheme } from './StageBackground';
import WeatherEffect, { WeatherType } from './WeatherEffect';

// ── Ảnh nền dự phòng (Unsplash) — dùng khi chưa có GIF từ Supabase
const FALLBACK_BG: Record<string, string[]> = {
  multiplechoice: [
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900&q=80',
    'https://images.unsplash.com/photo-1588072432836-e10032774350?w=900&q=80',
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=900&q=80',
  ],
  fillblank: [
    'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=900&q=80',
    'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=900&q=80',
    'https://images.unsplash.com/photo-1517842645767-c639042777db?w=900&q=80',
  ],
  matchword: [
    'https://images.unsplash.com/photo-1555431189-0fabf2179ef9?w=900&q=80',
    'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=900&q=80',
    'https://images.unsplash.com/photo-1484820540004-14229fe36ca4?w=900&q=80',
  ],
  reorder: [
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=900&q=80',
    'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=900&q=80',
  ],
  truefalse: [
    'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=900&q=80',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80',
  ],
  typing: [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80',
    'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=900&q=80',
  ],
};

// Map: question_type -> URL[]
type LessonBgs = Record<string, string[]>;

type QuestionItem = 
  | { type: 'multiplechoice', data: MultipleChoiceQuestion }
  | { type: 'fillblank', data: FillBlankQuestion }
  | { type: 'matchword', data: MatchPair[] } // one level
  | { type: 'reorder', data: ReorderQuestion }
  | { type: 'truefalse', data: TrueFalseQuestion }
  | { type: 'typing', data: TypingQuestion };

interface Props {
  challenge: ChallengeDef;
  userId: string;
  onComplete: (gainedStars: number) => void;
  onPenalty: () => void;
  onBack: () => void;
}


const PRAISE = ['Tuyệt vời! 🎉','Xuất sắc! ⭐','Chính xác rồi! ✅','Giỏi lắm! 👏','Chuẩn không cần chỉnh! 💯','Thông minh quá! 🧠','Không sai một chữ! 🔥','Bạn thật xuất sắc! 🌟','Làm tốt lắm! 💪','Hoàn hảo! 🏆'];

export default function LessonEngine({ challenge, userId, onComplete, onPenalty, onBack }: Props) {
  const [items, setItems] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dotColors, setDotColors] = useState<('none'|'correct'|'wrong')[]>([]);

  // GIF từ Supabase theo lesson_id
  const [lessonBgs, setLessonBgs] = useState<LessonBgs>({});
  // Hiệu ứng thời tiết (đọc từ settings chung)
  const [weatherType, setWeatherType] = useState<WeatherType>('none');

  // Game state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [matchSelectedLeft, setMatchSelectedLeft] = useState<string | null>(null);
  const [matchMatched, setMatchMatched] = useState<string[]>([]);
  const [reorderSelected, setReorderSelected] = useState<string[]>([]);
  const [reorderAvailable, setReorderAvailable] = useState<string[]>([]);
  const [matchRightItems, setMatchRightItems] = useState<{id: string, left: string, right: string}[]>([]);

  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);
  const [praise, setPraise] = useState('');
  const [penaltyAnim, setPenaltyAnim] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [finalStars, setFinalStars] = useState(0);

  // Timer theo từng loại câu hỏi
  const DEFAULT_TIMER_MAP: Record<string, number> = {
    multiplechoice: 0, fillblank: 0, truefalse: 0,
    typing: 0, reorder: 0, matchword: 0,
  };
  const [timerMap, setTimerMap] = useState<Record<string, number>>(DEFAULT_TIMER_MAP);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Số giây của câu hiện tại
  const activeTimer = timerMap[currentItem?.type ?? ''] ?? 0;

  // Web Audio tick sound
  const playTick = React.useCallback((urgent = false) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = urgent ? 880 : 660;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  }, []);

  // Fetch weather + timer settings
  useEffect(() => {
    Promise.all([
      getAppSetting<{ type: WeatherType; enabled: boolean }>('weather', { type: 'none', enabled: false }),
      getAppSetting<Record<string, number>>('question_timers', DEFAULT_TIMER_MAP),
    ]).then(([w, qt]) => {
      setWeatherType(w.enabled ? w.type : 'none');
      setTimerMap({ ...DEFAULT_TIMER_MAP, ...qt });
    });
  }, []);

  // Countdown — chạy lại mỗi lần đổi câu hoặc khi có feedback
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (activeTimer <= 0 || feedback !== null || showEndScreen) { setTimeLeft(0); return; }
    setTimeLeft(activeTimer);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        playTick(prev <= 5);
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, activeTimer, feedback]);

  // Hết giờ → tự động bỏ qua (tính sai)
  useEffect(() => {
    if (timeLeft === 0 && activeTimer > 0 && feedback === null && !showEndScreen && items.length > 0) {
      handleTimeUp();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // ── Load GIF từ Supabase theo lesson_id ──────────────────────────────
  useEffect(() => {
    const lessonId = challenge.lessonId;
    (async () => {
      try {
        // Fetch cả GIF của bài học và GIF dùng chung (lesson_id IS NULL)
        const { data } = await supabase
          .from('lesson_gifs')
          .select('url, question_type, challenge_id, lesson_id')
          .or(`lesson_id.eq.${lessonId},lesson_id.is.null`);
        if (!data || data.length === 0) return;
        const map: LessonBgs = {};
        data.forEach(row => {
          const url: string = row.url || '';
          if (!url) return;
          if (row.question_type === '__frame__') return; // frame xử lý ở App.tsx
          const key: string = row.challenge_id
            ? `challenge:${row.challenge_id}`
            : row.question_type || '__all__';
          if (!map[key]) map[key] = [];
          map[key].push(url);
        });
        setLessonBgs(map);
      } catch { /* silent fail */ }
    })();
  }, [challenge.lessonId]); // eslint-disable-line

  // ── Độ ưu tiên: challenge cụ thể > loại câu hỏi > bài dùng chung > fallback ──
  const getActiveBg = (type: string, seed: number): string => {
    const byChallenge = lessonBgs[`challenge:${challenge.id}`];
    if (byChallenge && byChallenge.length > 0) return byChallenge[seed % byChallenge.length];
    const specific = lessonBgs[type];
    if (specific && specific.length > 0) return specific[seed % specific.length];
    const generic = lessonBgs['__all__'];
    if (generic && generic.length > 0) return generic[seed % generic.length];
    const pool = FALLBACK_BG[type] || FALLBACK_BG.multiplechoice;
    return pool[seed % pool.length];
  };

  useEffect(() => {
    const data = getAppContent();
    const loadedItems: QuestionItem[] = [];
    
    // Get user progress
    const progress = getStoreData<{ completedIds: string[] }>(`hvtv_prog_${userId}_${challenge.id}`, { completedIds: [] });
    const completed = new Set(progress.completedIds);
    
    // We fetch all available questions for this challenge.id that ARE NOT completed
    if (data.multiplechoice[challenge.id]) {
      data.multiplechoice[challenge.id].filter(q => !completed.has(q.id)).forEach(q => loadedItems.push({ type: 'multiplechoice', data: q }));
    }
    if (data.fillblank[challenge.id]) {
      data.fillblank[challenge.id].filter(q => !completed.has(q.id)).forEach(q => loadedItems.push({ type: 'fillblank', data: q }));
    }
    if (data.truefalse[challenge.id]) {
      data.truefalse[challenge.id].filter(q => !completed.has(q.id)).forEach(q => loadedItems.push({ type: 'truefalse', data: q }));
    }
    if (data.typing[challenge.id]) {
      data.typing[challenge.id].filter(q => !completed.has(q.id)).forEach(q => loadedItems.push({ type: 'typing', data: q }));
    }
    if (data.reorder[challenge.id]) {
      data.reorder[challenge.id].filter(q => !completed.has(q.id)).forEach(q => loadedItems.push({ type: 'reorder', data: q }));
    }
    if (data.matchword[challenge.id]) {
      // For matchword, since it's array of arrays, we can use the first item's id as the block id
      data.matchword[challenge.id].filter(level => level.length > 0 && !completed.has(level[0].id)).forEach(level => loadedItems.push({ type: 'matchword', data: level }));
    }

    // Shuffle the items to make the challenge mixed
    loadedItems.sort(() => Math.random() - 0.5);
    setItems(loadedItems);
  }, [challenge.id, userId]);

  const currentItem = items[currentIndex];

  // Initialize specific game states when item changes
  useEffect(() => {
    setFeedback(null);
    setSelectedOption(null);
    setTypedAnswer('');
    setMatchSelectedLeft(null);
    setMatchMatched([]);
    setReorderSelected([]);
    
    if (currentItem?.type === 'reorder') {
       setReorderAvailable([...currentItem.data.words].sort(() => Math.random() - 0.5));
    } else if (currentItem?.type === 'matchword') {
       setMatchRightItems([...currentItem.data].sort(() => 0.5 - Math.random()));
    }
  }, [currentIndex, currentItem]);

  const handleCheck = () => {
    if (!currentItem) return;

    let isCorrect = false;

    if (currentItem.type === 'multiplechoice') {
      isCorrect = selectedOption === currentItem.data.answer;
    } else if (currentItem.type === 'fillblank') {
      isCorrect = selectedOption === currentItem.data.answer;
    } else if (currentItem.type === 'truefalse') {
      isCorrect = (selectedOption === 'true' && currentItem.data.isTrue) || (selectedOption === 'false' && !currentItem.data.isTrue);
    } else if (currentItem.type === 'typing') {
      isCorrect = typedAnswer.trim().toLowerCase() === currentItem.data.word.toLowerCase();
    } else if (currentItem.type === 'reorder') {
      isCorrect = reorderSelected.join(' ') === currentItem.data.correctOrder.join(' ');
    } else if (currentItem.type === 'matchword') {
      isCorrect = matchMatched.length === currentItem.data.length;
    }

    if (isCorrect) {
      setFeedback('success');
      setPraise(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
      setCorrectCount(c => { correctCountRef.current = c + 1; return c + 1; });
      setDotColors(prev => { const n = [...prev]; n[currentIndex] = 'correct'; return n; });
      soundManager.play('correct');
      setTimeout(() => soundManager.play('star_gain'), 400);

      // Dừng đếm giờ ngay khi trả lời đúng
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(0);

      // ✅ Cộng sao NGAY LẬP TỨC vào Supabase
      if (userId) awardStars(userId, 10, 'correct_answer');

      const progress = getStoreData<{ completedIds: string[] }>(`hvtv_prog_${userId}_${challenge.id}`, { completedIds: [] });
      let qid = currentItem.type === 'matchword' ? currentItem.data[0].id : currentItem.data.id;
      progress.completedIds.push(qid);
      setStoreData(`hvtv_prog_${userId}_${challenge.id}`, progress);

      // Tự động chuyển sang câu tiếp theo sau 900ms (hiệu ứng praise)
      setTimeout(() => {
        setFeedback(null);
        handleContinue();
      }, 900);
    } else {
      setFeedback('error');
      setDotColors(prev => { const n = [...prev]; n[currentIndex] = 'wrong'; return n; });
      setPenaltyAnim(true);
      setTimeout(() => setPenaltyAnim(false), 900);
      soundManager.play('wrong');
      setTimeout(() => soundManager.play('star_loss'), 300);

      if (userId) {
        const wrongKey = `hvtv_wrong_${userId}`;
        const prevData = getStoreData<Record<string, number>>(wrongKey, {});
        const qid = currentItem.type === 'matchword' ? currentItem.data[0]?.id || 'unknown' : currentItem.data.id;
        if (qid) { prevData[qid] = (prevData[qid] || 0) + 1; setStoreData(wrongKey, prevData); }
      }
      onPenalty();
    }
  };

  // Hết giờ: đánh dấu sai, delay ngắn rồi chuyển câu
  const handleTimeUp = () => {
    if (!currentItem || feedback !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setFeedback('error');
    setDotColors(prev => { const n = [...prev]; n[currentIndex] = 'wrong'; return n; });
    setPenaltyAnim(true);
    setTimeout(() => setPenaltyAnim(false), 900);
    soundManager.play('wrong');
    onPenalty();
    // Tự động chuyển câu sau 1.5s
    setTimeout(() => { setFeedback(null); handleContinue(); }, 1500);
  };

  const correctCountRef = React.useRef(0);
  const handleContinue = () => {
    if (currentIndex < items.length - 1) {
      soundManager.play('question_done');
      setCurrentIndex(prev => prev + 1);
    } else {
      const gained = correctCountRef.current * 10;
      const pct = items.length > 0 ? correctCountRef.current / items.length : 0;
      if (pct >= 0.8) soundManager.play('victory');
      else soundManager.play('challenge_done');
      setFinalStars(gained);
      setShowEndScreen(true);
      onComplete(0);
    }
  };

  const isCheckDisabled = () => {
    if (!currentItem) return true;
    if (currentItem.type === 'multiplechoice' || currentItem.type === 'fillblank' || currentItem.type === 'truefalse') {
      return selectedOption === null;
    }
    if (currentItem.type === 'typing') {
      return typedAnswer.trim() === '';
    }
    if (currentItem.type === 'reorder') {
      return reorderAvailable.length > 0; // must use all words
    }
    if (currentItem.type === 'matchword') {
      return matchMatched.length < currentItem.data.length; // must match all
    }
    return false;
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-8 rounded-3xl mt-8">
        <h2 className="text-2xl font-bold text-gray-400 mb-4">Thử thách này chưa có câu hỏi nào.</h2>
        <button onClick={onBack} className="px-6 py-3 bg-gray-200 font-bold rounded-2xl hover:bg-gray-300">Trở lại</button>
      </div>
    );
  }

  // ── End Screen ───────────────────────────────────────────────────────────────
  if (showEndScreen) {
    const pct = items.length > 0 ? Math.round((correctCount / items.length) * 100) : 0;
    const msg = pct >= 80 ? '🏆 Xuất sắc! Bạn làm rất tốt!' : pct >= 50 ? '💪 Cố lên! Ôn thêm một chút nữa nhé!' : '📚 Hãy ôn lại bài và thử lại nhé!';
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl p-10 mt-8 max-w-2xl mx-auto w-full shadow-xl">
        <div className="text-6xl mb-4">{pct >= 80 ? '🎉' : pct >= 50 ? '😊' : '😅'}</div>
        <h2 className="text-3xl font-black text-slate-800 mb-2">Hoàn thành!</h2>
        <p className="text-slate-500 font-bold mb-8 text-center">{msg}</p>
        <div className="flex gap-8 mb-8">
          <div className="text-center">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-5xl font-black text-amber-500">{finalStars}</motion.div>
            <div className="text-sm font-bold text-slate-400 mt-1">⭐ Sao đạt được</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-black text-green-600">{correctCount}/{items.length}</div>
            <div className="text-sm font-bold text-slate-400 mt-1">✅ Câu đúng</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-black text-blue-600">{pct}%</div>
            <div className="text-sm font-bold text-slate-400 mt-1">📊 Tỉ lệ đúng</div>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={onBack} className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200">
            <Home className="w-5 h-5" /> Về trang chủ
          </button>
          <button onClick={() => { setShowEndScreen(false); setCurrentIndex(0); setCorrectCount(0); setDotColors([]); setFeedback(null); }}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-2xl font-bold hover:bg-green-600">
            <RotateCcw className="w-5 h-5" /> Chơi lại
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex-1 flex flex-col rounded-none sm:rounded-3xl overflow-hidden shadow-xl sm:mt-4 relative max-w-4xl mx-auto w-full">
      {/* Hiệu ứng thời tiết — portal */}
      <WeatherEffect type={weatherType} enabled={weatherType !== 'none'} mode="portal" />
      {/* Nội dung bên trong */}
      <div className="relative z-10 flex-1 flex flex-col bg-white/95 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-4 border-b-2 border-gray-100 shrink-0">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6 sm:w-8 sm:h-8" /></button>
        <div className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
          {items.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${
              i === currentIndex ? 'w-4 h-4 sm:w-5 sm:h-5 bg-blue-400 shadow-md animate-pulse' :
              dotColors[i] === 'correct' ? 'w-3 h-3 sm:w-4 sm:h-4 bg-green-500' :
              dotColors[i] === 'wrong'   ? 'w-3 h-3 sm:w-4 sm:h-4 bg-red-400' :
              'w-3 h-3 sm:w-4 sm:h-4 bg-gray-200'
            }`} />
          ))}
        </div>
        <span className="text-xs sm:text-sm font-bold text-gray-400 shrink-0">{currentIndex + 1}/{items.length}</span>

        {/* Penalty animation */}
        <AnimatePresence>
          {penaltyAnim && (
            <motion.span initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -30 }}
              exit={{}} transition={{ duration: 0.8 }}
              className="absolute right-20 top-4 text-red-500 font-black text-xl pointer-events-none">-5 ⭐</motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* GIF nền câu hỏi — thay đổi theo từng câu, có blur */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex + '-bg'}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-cover bg-center z-[1]"
            style={{
              backgroundImage: `url('${getActiveBg(currentItem?.type ?? 'multiplechoice', currentIndex)}')`
            }}
          />
        </AnimatePresence>
        {/* Overlay */}
        <div className="absolute inset-0 z-[2]" style={{ background: 'rgba(255,255,255,0.87)', backdropFilter: 'blur(2px)' }} />

        {/* ── Bộ đếm thời gian — hiển thị nổi bật trên câu hỏi ── */}
        {activeTimer > 0 && timeLeft > 0 && (
          <div className="relative z-10 px-3 sm:px-5 pt-3 shrink-0">
            <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border-2 transition-all ${
              timeLeft <= 5
                ? 'bg-red-50 border-red-300 animate-pulse'
                : timeLeft <= 10
                ? 'bg-orange-50 border-orange-300'
                : 'bg-blue-50 border-blue-200'
            }`}>
              {/* Số giây */}
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 transition-all ${
                timeLeft <= 5 ? 'bg-red-500 text-white' :
                timeLeft <= 10 ? 'bg-orange-400 text-white' :
                'bg-blue-500 text-white'
              }`}>
                {timeLeft}
              </div>
              {/* Progress bar thời gian */}
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-black ${
                    timeLeft <= 5 ? 'text-red-600' : timeLeft <= 10 ? 'text-orange-600' : 'text-blue-600'
                  }`}>
                    {timeLeft <= 5 ? '⚠️ Sắp hết giờ!' : timeLeft <= 10 ? '⏱ Nhanh lên!' : '⏱ Thời gian còn lại'}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{activeTimer}s</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                      timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-orange-400' : 'bg-blue-500'
                    }`}
                    style={{ width: `${(timeLeft / activeTimer) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIndex}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="w-full max-w-2xl mx-auto flex flex-col gap-3 sm:gap-5"
          >
            {currentItem?.type === 'multiplechoice' && (
              <>
                <h2 className="text-lg sm:text-2xl font-black text-[#1E293B] mb-2">Chọn đáp án đúng</h2>
                <div className="text-base sm:text-lg font-medium text-gray-700 bg-white/90 p-3 sm:p-5 rounded-2xl border-2 border-gray-100 border-b-4 shadow-sm">
                  {currentItem.data.question}
                </div>
                <div className="flex flex-col gap-2">
                  {currentItem.data.options.map((opt, i) => (
                    <button key={i} disabled={feedback !== null}
                      onClick={() => { setSelectedOption(opt); soundManager.play('select'); }}
                      className={`p-2.5 sm:p-4 rounded-xl border-2 border-b-4 font-bold text-sm sm:text-base text-left transition-all ${
                        selectedOption === opt ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white/90 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}>{opt}</button>
                  ))}
                </div>
              </>
            )}

            {currentItem?.type === 'fillblank' && (
              <>
                <h2 className="text-lg sm:text-2xl font-black text-[#1E293B] mb-2">Điền vào chỗ trống</h2>
                <div className="text-base sm:text-xl font-bold bg-gray-50 p-3 sm:p-6 rounded-2xl border-2 border-gray-100 border-b-4 flex items-center flex-wrap gap-2 justify-center leading-loose">
                  <span>{currentItem.data.sentenceBefore}</span>
                  <div className="min-w-[3rem] h-9 border-b-4 border-gray-300 inline-flex items-end justify-center text-blue-600 px-2 pb-1 bg-white rounded-t-xl">{selectedOption || '___'}</div>
                  <span>{currentItem.data.sentenceAfter}</span>
                </div>
                <div className="flex justify-center gap-2 sm:gap-4">
                  {currentItem.data.options.map((opt, i) => (
                    <button key={i} disabled={feedback !== null} onClick={() => setSelectedOption(opt)}
                      className={`px-4 sm:px-8 py-2 sm:py-3 rounded-xl border-2 border-b-4 font-black text-lg sm:text-2xl transition-all ${
                        selectedOption === opt ? 'border-blue-400 bg-blue-50 text-blue-700 scale-105' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 hover:-translate-y-1'
                      }`}>{opt}</button>
                  ))}
                </div>
              </>
            )}

            {currentItem?.type === 'truefalse' && (
              <>
                <h2 className="text-lg sm:text-2xl font-black text-[#1E293B] mb-2">Đúng hay Sai?</h2>
                <div className="text-base sm:text-xl font-bold text-gray-700 bg-rose-50 p-3 sm:p-6 rounded-2xl border-2 border-rose-100 border-b-4 text-center">
                  "{currentItem.data.statement}"
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button disabled={feedback !== null} onClick={() => setSelectedOption('true')}
                    className={`py-5 sm:py-8 rounded-2xl border-2 border-b-4 font-black text-xl sm:text-3xl transition-all ${
                      selectedOption === 'true' ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-200 hover:border-green-300 hover:bg-green-50 text-gray-500'
                    }`}>✅ ĐÚNG</button>
                  <button disabled={feedback !== null} onClick={() => setSelectedOption('false')}
                    className={`py-5 sm:py-8 rounded-2xl border-2 border-b-4 font-black text-xl sm:text-3xl transition-all ${
                      selectedOption === 'false' ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-500'
                    }`}>❌ SAI</button>
                </div>
              </>
            )}

            {currentItem?.type === 'typing' && (
              <>
                <h2 className="text-lg sm:text-2xl font-black text-[#1E293B] mb-2">Gõ lại từ sau</h2>
                <div className="text-center">
                  <div className="text-gray-500 font-bold text-xs sm:text-sm mb-1 uppercase tracking-widest">{currentItem.data.hint}</div>
                  <div className="text-3xl sm:text-5xl font-black text-[#1E293B] bg-teal-50 py-4 sm:py-6 rounded-2xl border-2 border-teal-100">{currentItem.data.word}</div>
                </div>
                <input autoFocus disabled={feedback !== null} value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  className="w-full text-center text-xl sm:text-3xl font-bold p-3 sm:p-5 bg-gray-50 border-4 border-gray-200 rounded-2xl focus:border-teal-400 focus:outline-none transition-colors"
                  placeholder="Nhập câu trả lời..."
                  onKeyDown={(e) => { if (e.key==='Enter' && !isCheckDisabled() && feedback===null) handleCheck(); else if (e.key==='Enter' && feedback!==null) handleContinue(); }}
                />
              </>
            )}

            {currentItem?.type === 'reorder' && (
              <>
                <h2 className="text-lg sm:text-2xl font-black text-[#1E293B] mb-2">Xếp thành câu hoàn chỉnh</h2>
                <div className="min-h-[60px] sm:min-h-[80px] p-3 sm:p-4 bg-gray-50 border-4 border-dashed border-gray-200 rounded-2xl flex flex-wrap gap-2 items-center content-start">
                  {reorderSelected.map((word, i) => (
                    <motion.button layout key={`sel-${i}`} disabled={feedback !== null}
                      onClick={() => { setReorderSelected(prev => prev.filter((_,idx) => idx!==i)); setReorderAvailable(prev => [...prev, word]); }}
                      className="px-3 sm:px-5 py-1.5 sm:py-2 bg-white border-2 border-gray-200 border-b-4 rounded-xl font-bold text-sm sm:text-lg text-gray-700 shadow-sm">{word}</motion.button>
                  ))}
                  {reorderSelected.length === 0 && <span className="text-gray-400 font-bold w-full text-center text-sm">Bấm vào các từ bên dưới...</span>}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {reorderAvailable.map((word, i) => (
                    <motion.button layout key={`avl-${i}`} disabled={feedback !== null}
                      onClick={() => { setReorderAvailable(prev => prev.filter((_,idx) => idx!==i)); setReorderSelected(prev => [...prev, word]); }}
                      className="px-3 sm:px-5 py-1.5 sm:py-2 bg-white border-2 border-gray-200 border-b-4 rounded-xl font-bold text-sm sm:text-lg text-gray-700 shadow-sm hover:-translate-y-1 transition-transform">{word}</motion.button>
                  ))}
                </div>
              </>
            )}

            {currentItem?.type === 'matchword' && (
              <>
                <h2 className="text-lg sm:text-2xl font-black text-[#1E293B] mb-2">Nối các cặp tương ứng</h2>
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="flex flex-col gap-2">
                    {currentItem.data.map((pair, i) => {
                      const isMatched = matchMatched.includes(pair.id);
                      const isSelected = matchSelectedLeft === pair.id;
                      return (
                        <button key={`l-${i}`} disabled={isMatched || feedback !== null} onClick={() => setMatchSelectedLeft(pair.id)}
                          className={`p-2 sm:p-3 rounded-xl border-2 border-b-4 font-bold text-xs sm:text-base transition-all min-h-[48px] flex items-center justify-center text-center
                            ${isMatched ? 'opacity-0 scale-95 pointer-events-none' : ''}
                            ${isSelected ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>{pair.left}</button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col gap-2">
                    {matchRightItems.map((pair, i) => {
                      const isMatched = matchMatched.includes(pair.id);
                      return (
                        <button key={`r-${i}`} disabled={isMatched || feedback !== null || !matchSelectedLeft}
                          onClick={() => { if (matchSelectedLeft===pair.id) { setMatchMatched(prev=>[...prev,pair.id]); setMatchSelectedLeft(null); soundManager.play('star_gain'); } else { setMatchSelectedLeft(null); soundManager.play('wrong'); } }}
                          className={`p-2 sm:p-3 rounded-xl border-2 border-b-4 font-bold text-xs sm:text-base transition-all min-h-[48px] flex items-center justify-center text-center
                            ${isMatched ? 'opacity-0 scale-95 pointer-events-none' : ''} border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}>{pair.right}</button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

          </motion.div>
        </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className={`w-full p-3 sm:p-5 flex items-center justify-between transition-colors border-t-2 relative shrink-0 ${
        feedback === 'success' ? 'bg-green-100 border-green-200' :
        feedback === 'error'   ? 'bg-red-100 border-red-200' :
        'bg-white border-gray-100'
      }`}>
        <div className="flex items-center gap-4">
          {feedback === 'success' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-3 text-green-700">
               <div className="bg-green-500 rounded-full p-2 text-white shadow-lg shadow-green-500/30">
                 <CheckCircle2 className="w-8 h-8" />
               </div>
               <div>
                 <div className="font-black text-xl hidden sm:block">{praise}</div>
                 <div className="text-green-600 font-bold text-sm">+10 ⭐</div>
               </div>
            </motion.div>
          )}
          {feedback === 'error' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col text-red-700">
               <div className="flex items-center gap-3 mb-1">
                 <div className="bg-red-500 rounded-full p-2 text-white shadow-lg shadow-red-500/30">
                   <XCircle className="w-8 h-8" />
                 </div>
                 <span className="font-black text-xl hidden sm:inline">Chưa đúng!</span>
               </div>
               <div className="text-red-900 font-bold ml-14">
                 Đáp án: {' '}
                 {currentItem?.type === 'multiplechoice' && currentItem.data.answer}
                 {currentItem?.type === 'fillblank' && currentItem.data.answer}
                 {currentItem?.type === 'truefalse' && (currentItem.data.isTrue ? 'Đúng' : 'Sai')}
                 {currentItem?.type === 'reorder' && currentItem.data.correctOrder.join(' ')}
                 {currentItem?.type === 'typing' && currentItem.data.word}
               </div>
            </motion.div>
          )}
        </div>

        <button
          disabled={feedback === null && isCheckDisabled()}
          onClick={feedback === null ? handleCheck : (feedback === 'error' ? () => {
             setFeedback(null); setSelectedOption(null); setTypedAnswer(''); setReorderSelected([]);
             if (currentItem?.type === 'reorder') setReorderAvailable([...currentItem.data.words].sort(() => 0.5 - Math.random()));
          } : handleContinue)}
          className={`px-5 sm:px-10 py-3 sm:py-4 rounded-2xl font-black text-base sm:text-xl uppercase tracking-widest transition-all ${
            feedback === 'success' ? 'bg-green-500 text-white hover:bg-green-600 border-b-4 border-green-700' :
            feedback === 'error'   ? 'bg-red-500 text-white hover:bg-red-600 border-b-4 border-red-700' :
            isCheckDisabled() ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
            'bg-green-500 text-white border-b-4 border-green-700 hover:bg-green-400'
          }`}
        >
          {feedback === null ? 'KIỂM TRA' : (feedback === 'error' ? 'THỬ LẠI' : 'TIẾP TỤC')}
        </button>
      </div>
      </div> {/* end inner content wrapper */}
    </div>
  );
}
