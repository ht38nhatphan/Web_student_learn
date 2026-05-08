/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ChevronLeft, LogOut } from 'lucide-react';
import confetti from 'canvas-confetti';
import { User, GameDef, ChallengeDef } from './types';
import LoginScreen from './components/LoginScreen';
import TeacherDashboard from './components/TeacherDashboard';
import StudentHome from './components/StudentHome';
import LessonEngine from './components/LessonEngine';
import StageBackground, { getPresetTheme } from './components/StageBackground';
import { getStoreData, setStoreData, loadAllData, awardStars, fetchUserStars, onStarsChanged, getAppSetting, getMusicTracks } from './lib/store';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { initSound, soundManager } from './lib/sound';
import { bgMusic } from './lib/bgMusic';
import { useRealtimeSync } from './lib/useRealtimeSync';

type AppState = 'login' | 'studentHome' | 'teacherHome' | 'playing' | 'celebration';

/**
 * Ph\u00e1t nh\u1ea1c t\u1eeb Supabase \u2014 ngu\u1ed3n duy nh\u1ea5t, kh\u00f4ng d\u00f9ng localStorage.
 * muted-autoplay trick cho ph\u00e9p ph\u00e1t ngay khi data v\u1ec1, kh\u00f4ng c\u1ea7n user gesture.
 */
async function startMusicFromSettings() {
  try {
    const [musicSetting, tracks] = await Promise.all([
      getAppSetting<{ enabled: boolean; volume: number; track_id: string | null }>(
        'music', { enabled: false, volume: 0.5, track_id: null }
      ),
      getMusicTracks(),
    ]);
    if (musicSetting.enabled) {
      const track = tracks.find(t => t.id === musicSetting.track_id);
      bgMusic.setVolume(musicSetting.volume);
      bgMusic.load(track?.url ?? null);
      bgMusic.setEnabled(true);
      bgMusic.play(); // muted trick \u2192 ph\u00e1t ngay kh\u00f4ng c\u1ea7n gesture
    } else {
      bgMusic.setEnabled(false);
    }
  } catch { /* silent */ }
}


export default function App() {
  const [appState, setAppState] = useState<AppState>('studentHome');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeGame, setActiveGame] = useState<GameDef | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeDef | null>(null);
  const [intendedGame, setIntendedGame] = useState<GameDef | null>(null);
  const [intendedChallenge, setIntendedChallenge] = useState<ChallengeDef | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [playingFrameUrl, setPlayingFrameUrl] = useState<string | null>(null);
  // Teacher password gate
  const [teacherPwModal, setTeacherPwModal] = useState<{ user: User } | null>(null);
  const [teacherPwInput, setTeacherPwInput] = useState('');
  const [teacherPwError, setTeacherPwError] = useState(false);

  useEffect(() => {
    initSound();
    if (!isSupabaseConfigured) {
      setAppReady(true);
      return;
    }
    loadAllData()
      .then(() => {
        setAppReady(true);
        startMusicFromSettings(); // Phát nhạc ngay khi app sẵn sàng — không cần đăng nhập
        const savedUser = getStoreData<User | null>('hvtv_user', null);
        if (savedUser) {
          setCurrentUser(savedUser);
          setAppState(savedUser.role === 'teacher' ? 'teacherHome' : 'studentHome');
        }
      })
      .catch(() => {
        setAppReady(true);
        startMusicFromSettings();
        const savedUser = getStoreData<User | null>('hvtv_user', null);
        if (savedUser) {
          setCurrentUser(savedUser);
          setAppState(savedUser.role === 'teacher' ? 'teacherHome' : 'studentHome');
        }
      });

    // Đăng ký callback để cập nhật sao khi awardStars thay đổi
    onStarsChanged((userId, newStars) => {
      setCurrentUser(prev => {
        if (!prev || prev.id !== userId) return prev;
        return { ...prev, stars: newStars };
      });
    });
  }, []);

  // Pause nhạc nền khi vào làm bài, resume khi về home
  useEffect(() => {
    if (appState === 'playing') bgMusic.pause();
    else if (appState === 'studentHome' && bgMusic.enabled) bgMusic.play();
  }, [appState]);

  // ── Realtime sync: đồng bộ tất cả máy khi DB thay đổi ──────────────────────
  useRealtimeSync({
    onContentChange: async () => {
      // Nội dung bài học / câu hỏi thay đổi → reload data và cập nhật state
      await loadAllData();
      // Trigger re-render bằng cách tạo timestamp key mới (hoặc reload trang nếu đang chơi)
      if (appState === 'playing') {
        // Không interrupt giữa chừng — chỉ hiện toast nhỏ để biết
        console.info('[Realtime] Nội dung đã được cập nhật bởi giáo viên.');
      } else {
        // Refresh toàn bộ trang để load data mới nhất
        window.location.reload();
      }
    },
  });

  // Fetch frame GIF/preset từ DB khi bắt đầu chơi — PHẢI TRƯỚC mọi early return
  useEffect(() => {
    if (appState !== 'playing' || !activeChallenge) { setPlayingFrameUrl(null); return; }
    const lessonId = activeChallenge.lessonId;
    (async () => {
      try {
        const { data } = await supabase
          .from('lesson_gifs')
          .select('url, lesson_id')
          .eq('question_type', '__frame__')
          .or(`lesson_id.eq.${lessonId},lesson_id.is.null`)
          .order('lesson_id', { nullsFirst: false })
          .limit(1);
        setPlayingFrameUrl(data?.[0]?.url ?? null);
      } catch { setPlayingFrameUrl(null); }
    })();
  }, [appState, activeChallenge?.lessonId]); // eslint-disable-line

  // Chưa sẵn sàng — hiển thị loading
  if (!appReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📚</div>
          <p className="text-2xl font-black text-slate-700">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  // Supabase chưa cấu hình — hiển thị hướng dẫn
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full border-4 border-amber-200">
          <div className="text-6xl text-center mb-4">⚙️</div>
          <h1 className="text-2xl font-black text-center text-slate-800 mb-2">Chưa cấu hình Supabase</h1>
          <p className="text-slate-500 text-center mb-6">Cần điền thông tin Supabase vào file <code className="bg-slate-100 px-2 py-0.5 rounded text-sm">.env.local</code></p>
          <div className="bg-slate-900 text-green-400 rounded-2xl p-4 font-mono text-sm space-y-1">
            <div className="text-gray-400"># .env.local</div>
            <div>VITE_SUPABASE_URL=<span className="text-yellow-400">https://xxx.supabase.co</span></div>
            <div>VITE_SUPABASE_ANON_KEY=<span className="text-yellow-400">eyJhbGci...</span></div>
          </div>
          <div className="mt-6 bg-blue-50 rounded-2xl p-4 text-sm text-blue-700">
            <p className="font-bold mb-1">📋 Cách lấy thông tin:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Vào <strong>app.supabase.com</strong></li>
              <li>Chọn project của bạn</li>
              <li>Vào <strong>Settings → API</strong></li>
              <li>Copy <strong>Project URL</strong> và <strong>anon public key</strong></li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const TEACHER_PASSWORD = '1';


  const handleLogin = async (user: User) => {
    const stars = await fetchUserStars(user.id);
    const logUser = { ...user, stars };

    if (user.role === 'teacher') {
      // Yêu cầu mật khẩu trước khi vào trang giáo viên
      setTeacherPwModal({ user: logUser });
      setTeacherPwInput('');
      setTeacherPwError(false);
      return;
    }

    // Student login — không cần mật khẩu, phát nhạc ngay trong gesture
    setCurrentUser(logUser);
    setStoreData('hvtv_user', logUser);
    startMusicFromSettings(); // async — không await để không block navigation
    if (intendedGame && intendedChallenge) {
      setActiveGame(intendedGame);
      setActiveChallenge(intendedChallenge);
      setAppState('playing');
      setIntendedGame(null);
      setIntendedChallenge(null);
    } else if (intendedGame) {
      startGame(intendedGame);
      setIntendedGame(null);
    } else {
      setAppState('studentHome');
    }
  };

  const confirmTeacherPassword = () => {
    if (!teacherPwModal) return;
    if (teacherPwInput === TEACHER_PASSWORD) {
      const logUser = teacherPwModal.user;
      setCurrentUser(logUser);
      setStoreData('hvtv_user', logUser);
      setTeacherPwModal(null);
      setAppState('teacherHome');
    } else {
      setTeacherPwError(true);
      setTeacherPwInput('');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setStoreData('hvtv_user', null);
    setAppState('studentHome');
    setActiveGame(null);
    setActiveChallenge(null);
    setIntendedGame(null);
    setIntendedChallenge(null);
  };

  const addStars = (amount: number) => {
    if (!currentUser) return;
    // Dùng awardStars thay vì localStorage trực tiếp
    awardStars(currentUser.id, amount, 'correct_answer');
    // UI đã được cập nhật qua onStarsChanged callback
  };

  const deductStars = (amount: number) => {
    if (!currentUser) return;
    awardStars(currentUser.id, -amount, 'wrong_penalty');
  };

  const handleSelectChallenge = (game: GameDef, challenge: ChallengeDef) => {
    if (!currentUser) {
      setIntendedGame(game);
      setIntendedChallenge(challenge);
      setAppState('login');
      return;
    }
    setActiveGame(game);
    setActiveChallenge(challenge);
    setAppState('playing');
  };

  const startGame = (game: GameDef) => {
    setActiveGame(game);
    setAppState('playing');
  };

  const handleGameFinish = (_gainedStars: number) => {
    // Sao đã được cộng TỪNG CÂU trong LessonEngine.handleCheck → không cộng thêm ở đây
    setAppState('celebration');
    
    let count = 0;
    const interval = setInterval(() => {
      confetti({
        particleCount: 80 + Math.random() * 50,
        spread: 100 + Math.random() * 50,
        origin: { y: 0.6, x: Math.random() * 0.6 + 0.2 },
        colors: ['#FDE68A', '#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6'],
        zIndex: 100
      });
      count++;
      if (count > 4) clearInterval(interval);
    }, 600);

    setTimeout(() => {
      clearInterval(interval);
      setAppState('studentHome');
      setActiveChallenge(null);
    }, 3500);
  };

  const renderGameEngine = () => {
    if (!activeChallenge) return null;
    return <LessonEngine 
        challenge={activeChallenge} 
        userId={currentUser?.id || ''}
        onComplete={handleGameFinish} 
        onPenalty={() => deductStars(5)}
        onBack={() => { setActiveChallenge(null); setAppState('studentHome'); }} 
      />;
  };

  // ── Modal mật khẩu giáo viên (JSX dùng lại ở nhiều nhánh)
  const teacherPwModalJSX = teacherPwModal ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4 flex flex-col gap-5 border-4 border-purple-200">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl">🔐</div>
          <h2 className="text-xl font-black text-slate-800">Xác thực Giáo viên</h2>
          <p className="text-sm text-slate-500 mt-1">Nhập mật khẩu để truy cập trang quản lý</p>
        </div>
        <input
          type="password"
          value={teacherPwInput}
          onChange={e => { setTeacherPwInput(e.target.value); setTeacherPwError(false); }}
          onKeyDown={e => e.key === 'Enter' && confirmTeacherPassword()}
          placeholder="Nhập mật khẩu..."
          autoFocus
          className={`w-full border-2 rounded-2xl px-4 py-3 text-center text-xl font-black tracking-widest outline-none transition-all ${
            teacherPwError ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-purple-400'
          }`}
        />
        {teacherPwError && (
          <p className="text-red-500 font-bold text-sm text-center -mt-2">❌ Mật khẩu không đúng, thử lại!</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => { setTeacherPwModal(null); setTeacherPwError(false); }}
            className="flex-1 py-3 rounded-2xl border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >Huỷ</button>
          <button
            onClick={confirmTeacherPassword}
            className="flex-1 py-3 rounded-2xl bg-purple-500 hover:bg-purple-600 border-b-4 border-purple-700 font-black text-white transition-all"
          >Xác nhận ✓</button>
        </div>
      </div>
    </div>
  ) : null;

  if (appState === 'login') {
    return (
      <>
        <LoginScreen onLogin={handleLogin} onCancel={() => { setAppState('studentHome'); setIntendedGame(null); }} />
        {/* Modal mật khẩu hiện NGAY TRÊN màn hình đăng nhập */}
        {teacherPwModalJSX}
      </>
    );
  }

  if (appState === 'teacherHome' && currentUser?.role === 'teacher') {
    return <TeacherDashboard user={currentUser} onLogout={handleLogout} />;
  }

  return (
    <>
    {/* Modal mật khẩu cũng hiển thị nếu từ studentHome redirect tới */}
    {teacherPwModalJSX}
    <div className="min-h-screen w-full bg-[#FFFBEB] text-[#1E293B] flex flex-col font-sans overflow-hidden">
      {/* Top Navigation */}
      <nav className="h-20 bg-white border-b-4 border-[#FCD34D] flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm relative z-20">
        
        {appState === 'playing' ? (
          <button 
            onClick={() => { setAppState('studentHome'); setActiveGame(null); }}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full font-bold transition-colors"
          >
            <ChevronLeft className="w-5 h-5" /> Trở về
          </button>
        ) : (
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setAppState('studentHome')}>
            <div className="w-12 h-12 bg-[#F59E0B] rounded-2xl rotate-12 flex items-center justify-center text-white shadow-lg group-hover:rotate-[24deg] transition-transform">
              <span className="text-2xl -rotate-12 group-hover:-rotate-[24deg] transition-transform">CD</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#1E293B] hidden sm:block">
              Tiếng Việt <span className="text-[#F59E0B]">Lớp 2</span>
            </h1>
          </div>
        )}

        <div className="flex items-center gap-4 md:gap-6">
          {currentUser && (
            <div className="bg-[#FDE68A] px-4 md:px-6 py-2 rounded-full border-2 border-[#F59E0B] flex items-center gap-2 shadow-inner">
              <motion.span 
                key={currentUser?.stars}
                initial={{ scale: 1.5, color: '#eab308' }}
                animate={{ scale: 1, color: '#1E293B' }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="text-lg md:text-xl font-bold"
              >
                {currentUser?.stars?.toLocaleString()}
              </motion.span>
              <span className="text-xl">⭐</span>
            </div>
          )}

          {currentUser ? (
            <div className="relative">
              <div 
                className="flex items-center gap-3 bg-white p-1 pr-4 rounded-full border-2 border-gray-100 shadow-sm cursor-pointer hover:border-blue-200 transition-colors" 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className={`w-10 h-10 ${currentUser?.color.split(' ')[0]} rounded-full border-2 border-white flex items-center justify-center font-bold text-xl overflow-hidden shadow-inner`}>
                  {currentUser?.avatar}
                </div>
                <span className="font-bold hidden md:block">{currentUser?.name}</span>
              </div>
              
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-14 bg-white border-4 border-gray-200 rounded-2xl shadow-xl w-48 overflow-hidden z-50 flex flex-col"
                  >
                    <div className="p-3 bg-gray-50 border-b-2 border-gray-100 font-bold text-sm text-gray-500 text-center uppercase tracking-wider">
                      Hồ sơ của bạn
                    </div>
                    {/* Add profile view/options here if needed */}
                    <button 
                      onClick={() => {
                         setUserMenuOpen(false);
                         handleLogout();
                      }}
                      className="flex items-center gap-2 p-4 font-bold text-red-500 hover:bg-red-50 transition-colors justify-center"
                    >
                      <LogOut className="w-5 h-5" /> Đăng xuất
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button 
              onClick={() => setAppState('login')}
              className="bg-[#2563EB] text-white px-6 py-2 rounded-full font-bold shadow-sm hover:bg-[#1D4ED8] transition-colors uppercase tracking-wide text-sm"
            >
              Đăng nhập
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      {appState === 'studentHome' && (
        <StudentHome 
          user={currentUser} 
          onLogout={handleLogout} 
          onSelectChallenge={handleSelectChallenge}
          initialLesson={activeGame}
        />
      )}

      {appState === 'playing' && (() => {
        const presetTheme = playingFrameUrl ? getPresetTheme(playingFrameUrl) : null;
        const hasCustomFrame = playingFrameUrl && !presetTheme;
        return (
          <main className="flex-1 flex flex-col relative overflow-hidden z-0">
            {/* Frame: preset animation hoặc GIF ảnh */}
            {presetTheme && <StageBackground theme={presetTheme} />}
            {hasCustomFrame && <img src={playingFrameUrl!} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" />}
            {/* Nếu không có frame từ DB → dùng playing-bg mặc định */}
            {!playingFrameUrl && (
              <div className="absolute inset-0 z-0 playing-bg">
                <div className="playing-orb w-32 h-32 bg-white/20" style={{'--dur':'7s','--delay':'0s', top:'8%', left:'5%'} as React.CSSProperties} />
                <div className="playing-orb w-20 h-20 bg-yellow-300/30" style={{'--dur':'5s','--delay':'1.2s', top:'20%', right:'8%'} as React.CSSProperties} />
                <div className="playing-orb w-40 h-40 bg-pink-400/20" style={{'--dur':'9s','--delay':'0.5s', bottom:'10%', left:'12%'} as React.CSSProperties} />
                {['⭐','🌟','✨','💫','⭐','🌟','✨','💫','⭐','✨'].map((s, i) => (
                  <span key={i} className="playing-star select-none" style={{ top:`${10+(i*83%80)}%`, left:`${5+(i*97%90)}%`, fontSize:`${14+(i%3)*8}px`, '--dur':`${1.5+(i%4)*0.7}s`, '--delay':`${(i*0.3)%2}s` } as React.CSSProperties}>{s}</span>
                ))}
              </div>
            )}
            {/* Content — fill entire remaining space */}
            <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
              {renderGameEngine()}
            </div>
          </main>
        );
      })()}

      {appState === 'celebration' && (
         <main className="flex-1 flex items-center justify-center overflow-y-auto relative z-10 p-4 md:p-8 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white/95 backdrop-blur-sm rounded-[40px] border-4 border-white shadow-2xl p-10 md:p-16 flex flex-col items-center justify-center w-full max-w-2xl text-center space-y-8"
            >
              <div className="flex justify-center gap-4">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
                  <Star className="w-20 h-20 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
                </motion.div>
                <motion.div animate={{ rotate: -360, scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                  <Star className="w-24 h-24 text-orange-400 fill-orange-400 drop-shadow-lg" />
                </motion.div>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                  <Star className="w-20 h-20 text-pink-400 fill-pink-400 drop-shadow-lg" />
                </motion.div>
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500 uppercase tracking-tight transform -rotate-2">
                Xuất Sắc!
              </h2>
              <p className="text-2xl text-gray-700 font-bold tracking-wider">Bạn vừa hoàn thành thử thách!</p>
            </motion.div>
         </main>
      )}

    </div>
    </>
  );
}
