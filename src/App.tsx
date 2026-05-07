/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ChevronLeft, LogOut } from 'lucide-react';
import confetti from 'canvas-confetti';
import { User, GameDef, ChallengeDef } from './types';
import LoginScreen from './components/LoginScreen';
import TeacherDashboard from './components/TeacherDashboard';
import StudentHome from './components/StudentHome';
import LessonEngine from './components/LessonEngine';
import { getStoreData, setStoreData, loadAllData } from './lib/store';
import { isSupabaseConfigured } from './lib/supabase';

type AppState = 'login' | 'studentHome' | 'teacherHome' | 'playing' | 'celebration';

export default function App() {
  const [appState, setAppState] = useState<AppState>('studentHome');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeGame, setActiveGame] = useState<GameDef | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeDef | null>(null);
  const [intendedGame, setIntendedGame] = useState<GameDef | null>(null);
  const [intendedChallenge, setIntendedChallenge] = useState<ChallengeDef | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAppReady(true); // chạy vào màn hình cấu hình
      return;
    }
    loadAllData()
      .then(() => {
        setAppReady(true);
        const savedUser = getStoreData<User | null>('hvtv_user', null);
        if (savedUser) {
          setCurrentUser(savedUser);
          setAppState(savedUser.role === 'teacher' ? 'teacherHome' : 'studentHome');
        }
      })
      .catch(() => {
        setAppReady(true);
        const savedUser = getStoreData<User | null>('hvtv_user', null);
        if (savedUser) {
          setCurrentUser(savedUser);
          setAppState(savedUser.role === 'teacher' ? 'teacherHome' : 'studentHome');
        }
      });
  }, []);

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

  const handleLogin = (user: User) => {
    // In a real app we fetch their current stars here. For now we use the mock.
    const stars = getStoreData<number>(`hvtv_stars_${user.id}`, user.stars);
    const logUser = { ...user, stars };
    setCurrentUser(logUser);
    setStoreData('hvtv_user', logUser);
    
    if (user.role === 'teacher') {
      setAppState('teacherHome');
    } else {
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
    const newStars = currentUser.stars + amount;
    const updatedUser = { ...currentUser, stars: newStars };
    setCurrentUser(updatedUser);
    setStoreData(`hvtv_stars_${currentUser.id}`, newStars);
    // Also update logged in user data slightly hacky but works for local mode
    setStoreData('hvtv_user', updatedUser);
  };

  const deductStars = (amount: number) => {
    if (!currentUser) return;
    const newStars = Math.max(0, currentUser.stars - amount);
    const updatedUser = { ...currentUser, stars: newStars };
    setCurrentUser(updatedUser);
    setStoreData(`hvtv_stars_${currentUser.id}`, newStars);
    setStoreData('hvtv_user', updatedUser);
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

  const handleGameFinish = (gainedStars: number) => {
    if (gainedStars > 0) addStars(gainedStars);
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
      // activeGame is kept so StudentHome opens directly to the challenge list of this lesson
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

  if (appState === 'login') {
    return <LoginScreen onLogin={handleLogin} onCancel={() => { setAppState('studentHome'); setIntendedGame(null); }} />;
  }

  if (appState === 'teacherHome' && currentUser?.role === 'teacher') {
    return <TeacherDashboard user={currentUser} onLogout={handleLogout} />;
  }

  return (
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

      {appState === 'playing' && (
        <main className="flex-1 flex flex-col relative overflow-hidden z-0">
          {/* Note: In Duolingo style, there are no stage backgrounds or header top bars, the Engine dictates the whole screen */}
          <div className="flex-1 flex items-center justify-center relative z-10 overflow-y-auto">
            {renderGameEngine()}
          </div>
        </main>
      )}

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
  );
}
