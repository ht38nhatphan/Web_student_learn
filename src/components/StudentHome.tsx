import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, GameDef, ChallengeDef } from '../types';
import Leaderboard from './Leaderboard';
import WeatherEffect, { WeatherType } from './WeatherEffect';
import { LogOut, ChevronLeft, PlayCircle, CheckCircle, Lock, Flame, Volume2, VolumeX } from 'lucide-react';
import { getGames, getAppContent, getStoreData, setStoreData, getAppSetting, getMusicTracks } from '../lib/store';
import { soundManager, playSound } from '../lib/sound';
import { bgMusic } from '../lib/bgMusic';
import type { HomeBgSetting } from './AmbienceSettings';
import { useRealtimeSync } from '../lib/useRealtimeSync';

interface Props {
  user: User | null;
  onLogout: () => void;
  onSelectChallenge: (game: GameDef, challenge: ChallengeDef) => void;
  initialLesson?: GameDef | null;
}

const THEME_COLORS: Record<string, { bg: string; border: string; text: string; shadow: string }> = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-300',   text: 'text-blue-600',   shadow: 'shadow-blue-100' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-600', shadow: 'shadow-orange-100' },
  green:  { bg: 'bg-green-50',  border: 'border-green-300',  text: 'text-green-600',  shadow: 'shadow-green-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-600', shadow: 'shadow-purple-100' },
  pink:   { bg: 'bg-pink-50',   border: 'border-pink-300',   text: 'text-pink-600',   shadow: 'shadow-pink-100' },
  red:    { bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-600',    shadow: 'shadow-red-100' },
};

function getGreeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'buổi sáng 🌞' : h < 18 ? 'buổi chiều ☀️' : 'buổi tối 🌙';
  return `Chào ${time}, ${name}!`;
}

const MOTIVATIONS = [
  'Hôm nay học thêm 10 phút nữa nhé 💪',
  'Mỗi ngày học một chút, giỏi hắn một chút! 🌟',
  'Kiến thức là kho báu, hãy khám phá! 🏆',
  'Bạn đang tiến bộ từng ngày! 🚀',
  'Cố lên, bạn làm được! 👏',
];

function getStreak(userId: string): number {
  if (!userId) return 0;
  const data = getStoreData<{ streak: number; lastDate: string }>(`hvtv_streak_${userId}`, { streak: 0, lastDate: '' });
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (data.lastDate === today) return data.streak;
  if (data.lastDate === yesterday) return data.streak;
  return 0;
}

function touchStreak(userId: string) {
  if (!userId) return;
  const key = `hvtv_streak_${userId}`;
  const data = getStoreData<{ streak: number; lastDate: string }>(key, { streak: 0, lastDate: '' });
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (data.lastDate === today) return;
  const newStreak = data.lastDate === yesterday ? data.streak + 1 : 1;
  setStoreData(key, { streak: newStreak, lastDate: today });
}

// Dark background values (gradient strings)
const DARK_BG_VALUES = [
  'linear-gradient(135deg,#667eea,#764ba2)',   // purple
  'linear-gradient(135deg,#43cea2,#185a9d)',   // ocean
  'linear-gradient(135deg,#f093fb,#f5576c)',   // sunset
  'linear-gradient(135deg,#56ab2f,#a8e063)',   // forest
  'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', // night
  'linear-gradient(135deg,#00b09b,#96c93d,#667eea)',  // aurora
];

export default function StudentHome({ user, onLogout, onSelectChallenge, initialLesson }: Props) {
  const [selectedLesson, setSelectedLesson] = useState<GameDef | null>(initialLesson ?? null);
  const [streak, setStreak] = useState(0);
  const [muted, setMuted] = useState(soundManager.isMuted);
  const [bgOn, setBgOn] = useState(false);
  const [weatherType, setWeatherType] = useState<WeatherType>('none');
  const [homeBg, setHomeBg] = useState<HomeBgSetting>({ type: 'preset', value: '#FFFBEB' });
  const motivation = useMemo(() => MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)], []);

  useEffect(() => {
    if (user?.id) { touchStreak(user.id); setStreak(getStreak(user.id)); }
  }, [user?.id]);

  // Fetch weather + home background settings (nhạc do App.tsx quản lý)
  useEffect(() => {
    (async () => {
      const [weatherSetting, bgSetting] = await Promise.all([
        getAppSetting<{ type: WeatherType; enabled: boolean }>('weather', { type: 'none', enabled: false }),
        getAppSetting<HomeBgSetting>('home_bg', { type: 'preset', value: '#FFFBEB' }),
      ]);
      setWeatherType(weatherSetting.enabled ? weatherSetting.type : 'none');
      setHomeBg(bgSetting);
    })();
  }, []);

  // ── Realtime: cập nhật settings ngay khi giáo viên thay đổi ────────────────
  useRealtimeSync({
    onSettingChange: (key, value) => {
      if (key === 'weather') {
        const w = value as { type: WeatherType; enabled: boolean };
        setWeatherType(w?.enabled ? w.type : 'none');
      }
      if (key === 'home_bg') {
        setHomeBg(value as HomeBgSetting);
      }
      // music được xử lý trực tiếp trong useRealtimeSync hook
    },
  });

  // Legacy bg music toggle
  useEffect(() => {
    if (bgOn && !soundManager.isMuted) soundManager.startBGMusic();
    else soundManager.stopBGMusic();
    return () => soundManager.stopBGMusic();
  }, [bgOn, muted]);

  const toggleMute = () => {
    const newMuted = soundManager.toggleMute();
    setMuted(newMuted);
    if (newMuted) setBgOn(false);
  };

  const handleLessonSelect = (game: GameDef) => {
    playSound('lesson_open');
    setSelectedLesson(game);
  };

  const handleChallengeSelect = (game: GameDef, challenge: ChallengeDef) => {
    playSound('challenge_start');
    onSelectChallenge(game, challenge);
  };

  const gamesList = useMemo(() => getGames().filter(g => g.isActive !== false), []);
  const appContent = useMemo(() => getAppContent(), []);

  const getLessonStats = (lessonId: string) => {
    const challenges = appContent.challenges.filter(c => c.lessonId === lessonId);
    let totalStars = 0, earnedStars = 0, totalQ = 0, doneQ = 0;
    challenges.forEach(c => {
      const maxQ =
        (appContent.multiplechoice?.[c.id]?.length || 0) +
        (appContent.fillblank?.[c.id]?.length || 0) +
        (appContent.matchword?.[c.id]?.length || 0) +
        (appContent.reorder?.[c.id]?.length || 0);
      const prog = user ? getStoreData<{ completedIds: string[] }>(`hvtv_prog_${user.id}_${c.id}`, { completedIds: [] }) : { completedIds: [] };
      totalStars += maxQ * 10; earnedStars += prog.completedIds.length * 10;
      totalQ += maxQ; doneQ += prog.completedIds.length;
    });
    return { totalStars, earnedStars, totalQ, doneQ, isDone: totalQ > 0 && doneQ >= totalQ };
  };

  const renderLessonCard = (game: GameDef, idx: number) => {
    const colors = THEME_COLORS[game.theme] || THEME_COLORS.blue;
    const { totalStars, earnedStars, totalQ, doneQ, isDone } = getLessonStats(game.id);
    const pct = totalQ > 0 ? Math.min(100, (doneQ / totalQ) * 100) : 0;

    return (
      <motion.div
        key={game.id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(idx * 0.025, 0.8), type: 'spring', stiffness: 260, damping: 22 }}
        onClick={() => handleLessonSelect(game)}
        className="lesson-card group cursor-pointer select-none"
      >
        {isDone && (
          <div className="absolute top-2.5 right-2.5 text-green-500 drop-shadow-sm">
            <CheckCircle className="w-5 h-5" />
          </div>
        )}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${colors.bg} border-2 ${colors.border} group-hover:scale-110 transition-transform duration-200 shadow-sm`}>
          {game.icon}
        </div>
        <h3 className="font-black text-sm text-slate-800 leading-snug line-clamp-2">{game.title}</h3>
        {totalStars > 0 && (
          <div className={`flex items-center gap-1 text-xs font-black ${earnedStars > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
            <span>⭐</span>
            <span>{earnedStars > 0 ? `${earnedStars} / ${totalStars}` : `${totalStars} sao`}</span>
          </div>
        )}
        {totalQ > 0 && (
          <div className="w-full">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const renderChallengesList = () => {
    if (!selectedLesson) return null;
    const colors = THEME_COLORS[selectedLesson.theme] || THEME_COLORS.blue;
    const challenges = appContent.challenges.filter(c => c.lessonId === selectedLesson.id);
    return (
      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
        <header className="mb-8 flex items-center gap-4">
          <button
            onClick={() => setSelectedLesson(null)}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm shrink-0"
          >
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${colors.bg} border-2 ${colors.border} shrink-0`}>
            {selectedLesson.icon}
          </div>
          <div>
            <p className={`font-black uppercase tracking-widest text-xs mb-0.5 ${colors.text}`}>{selectedLesson.description}</p>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">{selectedLesson.title}</h2>
          </div>
        </header>

        {challenges.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-4 border-dashed border-slate-200 flex flex-col items-center gap-3">
            <Lock className="w-10 h-10 text-slate-300" />
            <p className="text-slate-400 font-bold text-lg">Chưa có thử thách nào!</p>
            <p className="text-slate-300 text-sm font-medium">Giáo viên sẽ thêm thử thách sớm nhé.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-2xl">
            {challenges.map((challenge, idx) => {
              const totalQ =
                (appContent.multiplechoice?.[challenge.id]?.length || 0) +
                (appContent.fillblank?.[challenge.id]?.length || 0) +
                (appContent.matchword?.[challenge.id]?.length || 0) +
                (appContent.reorder?.[challenge.id]?.length || 0) +
                (appContent.truefalse?.[challenge.id]?.length || 0) +
                (appContent.typing?.[challenge.id]?.length || 0);
              const maxStars = totalQ * 10;
              const progress = user
                ? getStoreData<{ completedIds: string[] }>(`hvtv_prog_${user.id}_${challenge.id}`, { completedIds: [] })
                : { completedIds: [] };
              const doneQ = progress.completedIds.length;
              const earnedStars = doneQ * 10;
              const isCompleted = totalQ > 0 && doneQ >= totalQ;
              const pct = totalQ > 0 ? Math.min(100, (doneQ / totalQ) * 100) : 0;

              return (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  onClick={() => !isCompleted && handleChallengeSelect(selectedLesson, challenge)}
                  className={`challenge-card ${isCompleted ? 'done' : 'group'}`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 transition-transform
                      ${isCompleted ? 'bg-green-100 text-green-600' : `${colors.bg} ${colors.text} group-hover:scale-110`}`}>
                      {isCompleted ? '✅' : idx + 1}
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <h3 className={`font-black text-base leading-tight ${isCompleted ? 'text-slate-500' : 'text-slate-800'}`}>
                        {challenge.title}
                      </h3>
                      {maxStars > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-500">
                            ⭐ {isCompleted ? earnedStars : maxStars} sao
                            {!isCompleted && earnedStars > 0 && ` (đã đạt ${earnedStars})`}
                          </span>
                        </div>
                      )}
                      {totalQ > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="progress-bar-track flex-1">
                            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-400 shrink-0">{doneQ}/{totalQ} câu</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {isCompleted ? (
                    <span className="shrink-0 px-3 py-1.5 rounded-xl bg-green-100 text-green-700 font-black text-xs uppercase tracking-wide">
                      Hoàn thành
                    </span>
                  ) : (
                    <PlayCircle className={`w-9 h-9 shrink-0 text-slate-200 group-hover:${colors.text} transition-colors`} />
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    );
  };

  // Compute background style
  const bgStyle: React.CSSProperties = homeBg.type === 'image'
    ? { backgroundImage: `url(${homeBg.value})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
    : { background: homeBg.value };

  // Detect dark background to adapt text/card styles
  const isDark = homeBg.type === 'image' || DARK_BG_VALUES.includes(homeBg.value);
  const glass = isDark ? 'bg-white/15 backdrop-blur-md border-white/20' : 'bg-white border-amber-100';
  const txt = isDark ? 'text-white' : 'text-slate-800';
  const txtSub = isDark ? 'text-white/70' : 'text-slate-400';
  const txtLabel = isDark ? 'text-white/90' : 'text-amber-500';

  return (
    <div className="flex flex-1 overflow-hidden w-full relative" style={bgStyle}>
      <WeatherEffect type={weatherType} enabled={weatherType !== 'none'} />
      {/* Sidebar */}
      <aside className={`hidden md:flex w-72 border-r-4 p-5 flex-col gap-5 shrink-0 overflow-y-auto z-10 transition-all ${glass}`}>
        <Leaderboard currentUserId={user?.id} />
        <div className="flex gap-2">
          <button onClick={toggleMute}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 text-sm font-bold transition-all ${
              isDark ? 'border-white/30 text-white hover:bg-white/10' : 'border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}>
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
            {muted ? 'Bật âm' : 'Tắt âm'}
          </button>
          {!muted && (
            <button onClick={() => setBgOn(v => !v)}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-2xl border-2 text-xs font-bold transition-all ${
                bgOn
                  ? (isDark ? 'border-purple-300 bg-purple-500/40 text-white' : 'border-purple-300 bg-purple-50 text-purple-600')
                  : (isDark ? 'border-white/30 text-white/70 hover:bg-white/10' : 'border-slate-200 text-slate-500 hover:bg-slate-50')
              }`}>
              🎵 {bgOn ? 'Nhạc: Bật' : 'Nhạc: Tắt'}
            </button>
          )}
        </div>
        {user?.role === 'student' && (
          <div className={`p-4 rounded-2xl border-2 border-dashed ${isDark ? 'border-white/20 bg-white/10' : 'bg-amber-50 border-amber-200'}`}>
            <p className={`text-xs font-black uppercase mb-3 ${isDark ? 'text-white/80' : 'text-amber-700'}`}>🎯 Nhiệm vụ hôm nay</p>
            <div className="space-y-2 text-sm font-semibold">
              {gamesList.slice(0, 3).map((g) => (
                <label key={g.id} className={`flex items-center gap-2 cursor-pointer ${isDark ? 'text-white/80' : 'text-slate-600'}`}>
                  <input type="checkbox" className="accent-amber-500 w-4 h-4 rounded" />
                  <span>Thử thách trong "{g.title.substring(0, 20)}"</span>
                </label>
              ))}
            </div>
          </div>
        )}
        {user ? (
          <button onClick={onLogout}
            className={`mt-auto flex items-center gap-2 justify-center py-2 font-bold text-sm transition-colors ${
              isDark ? 'text-white/50 hover:text-red-400' : 'text-slate-400 hover:text-red-500'
            }`}>
            <LogOut className="w-4 h-4" /><span>Đăng xuất</span>
          </button>
        ) : (
          <p className={`text-xs text-center mt-auto font-bold px-2 leading-relaxed ${txtSub}`}>
            Hãy đăng nhập để lưu tiến trình nhé! 🌟
          </p>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 z-10">
        <div className="mb-6 md:hidden"><Leaderboard /></div>
        <AnimatePresence mode="wait">
          {!selectedLesson ? (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <header className="mb-6">
                {user ? (
                  <>
                    <p className={`font-black uppercase tracking-widest text-xs mb-1 ${txtLabel}`}>{getGreeting(user.name)}</p>
                    <h2 className={`text-3xl md:text-4xl font-black ${txt}`}>
                      Các Bài Học <span className={isDark ? 'text-yellow-300' : 'text-blue-600'}>Của Bạn</span>
                    </h2>
                    <p className={`text-sm font-medium mt-1 ${txtSub}`}>{motivation}</p>
                    {streak > 0 && (
                      <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-sm font-black ${
                        isDark ? 'bg-white/20 text-white' : streak >= 7 ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-orange-50 text-orange-500'
                      }`}>
                        <Flame className="w-4 h-4" />{streak} ngày liên tiếp!
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className={`font-black uppercase tracking-widest text-xs mb-1 ${txtLabel}`}>Bộ Sách Cánh Diều</p>
                    <h2 className={`text-3xl md:text-4xl font-black ${txt}`}>
                      Các Bài Học <span className={isDark ? 'text-yellow-300' : 'text-blue-600'}>Của Bạn</span>
                    </h2>
                  </>
                )}
              </header>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {gamesList.map((game, i) => renderLessonCard(game, i))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="challenges" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderChallengesList()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
