import { useState, useEffect } from 'react';
import { User, GameDef } from '../types';
import { BookOpen, Edit3, LogOut, CheckSquare, Square, Plus, Trash2, Users, X, Volume2, VolumeX, Image, Sparkles, Video, UploadCloud, Loader2, Maximize2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getGames, saveGames, getAppContent, saveAppContent, deleteChallenge, getUsers, saveUsers, getStoreData, setStoreData } from '../lib/store';
import { AppData } from '../data/content';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../lib/sound';
import GifLibrary from './GifLibrary';
import AmbienceSettings from './AmbienceSettings';
import ClassOverview from './ClassOverview';

interface Props {
  user: User;
  onLogout: () => void;
}

export default function TeacherDashboard({ user, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'manage_games' | 'content' | 'manage_students' | 'gif_library' | 'ambience'>('overview');
  const [games, setGames] = useState<GameDef[]>([]);
  const [appContent, setAppContent] = useState<AppData | null>(null);
  
  // Game editor state
  const [editingGame, setEditingGame] = useState<GameDef | null>(null);
  const [editingChallenge, setEditingChallenge] = useState<string | null>(null); // ChallengeDef ID

  // Video upload state
  const [uploadingVideoId, setUploadingVideoId] = useState<string | null>(null);

  // Add student state
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');

  // Student and Game Management state
  const [editingGameMeta, setEditingGameMeta] = useState<{ game: GameDef, isNew: boolean } | null>(null);
  const [deletingGame, setDeletingGame] = useState<GameDef | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<User | null>(null);
  const [deletingChallenge, setDeletingChallenge] = useState<any | null>(null);
  const [studentsList, setStudentsList] = useState<User[]>([]);
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<'saving' | 'done' | 'error' | null>(null);
  const [muted, setMuted] = useState(soundManager.isMuted);
  const [deletingQuestion, setDeletingQuestion] = useState<{ type: keyof AppData, index: number } | null>(null);
  const [previewingQuestionModal, setPreviewingQuestionModal] = useState<{ type: keyof AppData, index: number } | null>(null);

  /** Wrapper: hiện toast nhỏ góc phải trong khi lưu, KHÔNG block UI */
  const withSaving = async (fn: () => Promise<void>) => {
    setSaveToast('saving');
    try {
      await fn();
      setSaveToast('done');
      soundManager.play('save_ok');
      setTimeout(() => setSaveToast(null), 2000);
    } catch (e) {
      console.error(e);
      setSaveToast('error');
      soundManager.play('warning');
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  useEffect(() => {
    setGames(getGames());
    setAppContent(getAppContent());
    setStudentsList(getUsers().filter(u => u.role === 'student'));
  }, []);

  const handleToggleGame = async (id: string) => {
    const newGames = games.map(g => g.id === id ? { ...g, isActive: !g.isActive } : g);
    setGames(newGames);
    await withSaving(() => saveGames(newGames));
  };

  const activeGamesCount = games.filter(g => g.isActive !== false).length;
  const totalStars = studentsList.reduce((acc, sum) => getStoreData(`hvtv_stars_${sum.id}`, sum.stars) + acc, 0);

  // Debounced save for input fields (no modal spam on every keystroke)
  let _saveGamesTimer: ReturnType<typeof setTimeout>;
  const debouncedSaveGames = (g: typeof games) => {
    clearTimeout(_saveGamesTimer);
    _saveGamesTimer = setTimeout(() => saveGames(g), 800);
  };
  let _saveUsersTimer: ReturnType<typeof setTimeout>;
  const debouncedSaveUsers = (u: typeof studentsList) => {
    clearTimeout(_saveUsersTimer);
    _saveUsersTimer = setTimeout(() => saveUsers([...getUsers().filter(x => x.role === 'teacher'), ...u]), 800);
  };
  let _saveContentTimer: ReturnType<typeof setTimeout>;
  const debouncedSaveContent = (c: AppData) => {
    clearTimeout(_saveContentTimer);
    _saveContentTimer = setTimeout(() => saveAppContent(c), 800);
  };

  const [editingQuestionModal, setEditingQuestionModal] = useState<{
    type: keyof AppData;
    index: number;
  } | null>(null);

  const handleAddQuestion = async (gameType: keyof AppData) => {
    if (!editingChallenge || !appContent) return;
    const newContent = { ...appContent };
    let newIndex = 0;
    if (gameType === 'fillblank') {
      if (!newContent.fillblank[editingChallenge]) newContent.fillblank[editingChallenge] = [];
      newContent.fillblank[editingChallenge].push({
        id: Date.now().toString(),
        sentenceBefore: 'Câu hỏi ',
        sentenceAfter: ' mới',
        options: ['A', 'B'],
        answer: 'A'
      });
      newIndex = newContent.fillblank[editingChallenge].length - 1;
    } else if (gameType === 'matchword') {
      if (!newContent.matchword[editingChallenge]) newContent.matchword[editingChallenge] = [];
      newContent.matchword[editingChallenge].push([
        { id: Date.now() + "1", left: "Từ 1", right: "Nghĩa 1" },
        { id: Date.now() + "2", left: "Từ 2", right: "Nghĩa 2" }
      ]);
      newIndex = newContent.matchword[editingChallenge].length - 1;
    } else if (gameType === 'multiplechoice') {
      if (!newContent.multiplechoice[editingChallenge]) newContent.multiplechoice[editingChallenge] = [];
      newContent.multiplechoice[editingChallenge].push({
        id: Date.now().toString(),
        question: "Câu hỏi mới",
        options: ["Đáp án A", "Đáp án B", "Đáp án C"],
        answer: "Đáp án A"
      });
      newIndex = newContent.multiplechoice[editingChallenge].length - 1;
    } else if (gameType === 'reorder') {
       if (!newContent.reorder[editingChallenge]) newContent.reorder[editingChallenge] = [];
       newContent.reorder[editingChallenge].push({
        id: Date.now().toString(),
        words: ["Câu", "này", "mới", "tạo"],
        correctOrder: ["Câu", "này", "mới", "tạo"]
      });
      newIndex = newContent.reorder[editingChallenge].length - 1;
    } else if (gameType === 'truefalse') {
       if (!newContent.truefalse[editingChallenge]) newContent.truefalse[editingChallenge] = [];
       newContent.truefalse[editingChallenge].push({
         id: Date.now().toString(),
         statement: "Nhận định này đúng hay sai?",
         isTrue: true
       });
       newIndex = newContent.truefalse[editingChallenge].length - 1;
    } else if (gameType === 'typing') {
       if (!newContent.typing[editingChallenge]) newContent.typing[editingChallenge] = [];
       newContent.typing[editingChallenge].push({
         id: Date.now().toString(),
         word: "chu",
         hint: "Gõ lại từ này"
       });
       newIndex = newContent.typing[editingChallenge].length - 1;
    }

    setAppContent(newContent);
    await withSaving(() => saveAppContent(newContent));
    setEditingQuestionModal({ type: gameType, index: newIndex });
  };

  const handleRemoveQuestion = (gameType: keyof AppData, index: number) => {
    setDeletingQuestion({ type: gameType, index });
  };

  const updateQuestion = (gameType: keyof AppData, index: number, newQuestionData: any) => {
    if (!editingChallenge || !appContent) return;
    const newContent = { ...appContent };
    if ((newContent[gameType] as any)?.[editingChallenge]) {
      (newContent[gameType] as any)[editingChallenge][index] = newQuestionData;
      setAppContent(newContent);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FFFBEB] text-[#1E293B] flex flex-col font-sans overflow-hidden">

      {/* ─── Save Toast (góc trên phải, không block UI) ─── */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl font-bold text-sm"
            style={{
              background: saveToast === 'done' ? '#10b981' : saveToast === 'error' ? '#ef4444' : '#8b5cf6',
              color: '#fff'
            }}
          >
            {saveToast === 'saving' ? (
              <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />Đang lưu...</>
            ) : saveToast === 'error' ? (
              <>⚠️ Có lỗi, vui lòng thử lại</>
            ) : (
              <>✅ Đã lưu thành công!</>
            )}
          </motion.div>
        )}
      </AnimatePresence>
       {/* Teacher Nav */}
       <nav className="h-16 md:h-20 bg-white border-b-4 border-purple-300 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm relative z-20">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg text-xl md:text-2xl shrink-0">
            {user.avatar}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-black uppercase tracking-tight text-[#1E293B] truncate">Quản lý <span className="text-purple-600 hidden sm:inline">Giáo Viên</span></h1>
            <p className="text-xs md:text-sm font-bold text-gray-500 truncate">Xin chào, {user.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button
            onClick={() => { const m = soundManager.toggleMute(); setMuted(m); }}
            title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="p-1.5 md:p-2 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            {muted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-red-400" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />}
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 md:gap-2 bg-red-50 text-red-600 px-3 md:px-4 py-1.5 md:py-2 rounded-full font-bold hover:bg-red-100 transition-colors border-2 border-red-200 text-sm md:text-base"
          >
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Thoát</span>
          </button>
        </div>
      </nav>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-white md:border-r-4 border-b-4 md:border-b-0 border-purple-200 p-4 md:p-6 flex flex-row md:flex-col gap-2 md:gap-4 shrink-0 overflow-x-auto md:overflow-y-auto">
          <div className="flex md:flex-col gap-2 md:gap-3 w-max md:w-full">
            <button onClick={() => {setActiveTab('overview'); setEditingGame(null); setEditingChallenge(null);}} className={`w-auto md:w-full text-left p-3 md:p-4 rounded-2xl font-bold flex items-center gap-2 md:gap-3 transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-purple-100 text-purple-700 border-2 border-purple-300' : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-transparent'}`}>
              <BookOpen className="w-5 h-5 md:w-6 md:h-6 shrink-0" /> <span className="hidden sm:inline">Tổng quan</span>
            </button>
            <button onClick={() => {setActiveTab('manage_games'); setEditingGame(null); setEditingChallenge(null);}} className={`w-auto md:w-full text-left p-3 md:p-4 rounded-2xl font-bold flex items-center gap-2 md:gap-3 transition-all whitespace-nowrap ${activeTab === 'manage_games' ? 'bg-purple-100 text-purple-700 border-2 border-purple-300' : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-transparent'}`}>
              <CheckSquare className="w-5 h-5 md:w-6 md:h-6 shrink-0" /> <span className="hidden sm:inline">Bật/Tắt Trò chơi</span>
            </button>
            <button onClick={() => {setActiveTab('content'); setEditingGame(null); setEditingChallenge(null);}} className={`w-auto md:w-full text-left p-3 md:p-4 rounded-2xl font-bold flex items-center gap-2 md:gap-3 transition-all whitespace-nowrap ${activeTab === 'content' ? 'bg-purple-100 text-purple-700 border-2 border-purple-300' : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-transparent'}`}>
              <Edit3 className="w-5 h-5 md:w-6 md:h-6 shrink-0" /> <span className="hidden sm:inline">Soạn câu hỏi</span>
            </button>
            <button onClick={() => {setActiveTab('manage_students'); setEditingGame(null); setEditingChallenge(null);}} className={`w-auto md:w-full text-left p-3 md:p-4 rounded-2xl font-bold flex items-center gap-2 md:gap-3 transition-all whitespace-nowrap ${activeTab === 'manage_students' ? 'bg-purple-100 text-purple-700 border-2 border-purple-300' : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-transparent'}`}>
              <Users className="w-5 h-5 md:w-6 md:h-6 shrink-0" /> <span className="hidden sm:inline">Học sinh</span>
            </button>
            <button onClick={() => {setActiveTab('gif_library'); setEditingGame(null); setEditingChallenge(null);}} className={`w-auto md:w-full text-left p-3 md:p-4 rounded-2xl font-bold flex items-center gap-2 md:gap-3 transition-all whitespace-nowrap ${activeTab === 'gif_library' ? 'bg-purple-100 text-purple-700 border-2 border-purple-300' : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-transparent'}`}>
              <Image className="w-5 h-5 md:w-6 md:h-6 shrink-0" /> <span className="hidden sm:inline">Thư viện GIF</span>
            </button>
            <button onClick={() => {setActiveTab('ambience'); setEditingGame(null); setEditingChallenge(null);}} className={`w-auto md:w-full text-left p-3 md:p-4 rounded-2xl font-bold flex items-center gap-2 md:gap-3 transition-all whitespace-nowrap ${activeTab === 'ambience' ? 'bg-purple-100 text-purple-700 border-2 border-purple-300' : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-transparent'}`}>
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 shrink-0" /> <span className="hidden sm:inline">Hiệu ứng &amp; Nhạc</span>
            </button>
          </div>
        </aside>

        {/* Selected View */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-gray-50 relative">
          {activeTab === 'overview' && appContent && (
            <ClassOverview
              students={studentsList}
              games={games}
              appContent={appContent}
            />
          )}

          {activeTab === 'manage_games' && (
            <div>
              <div className="flex justify-between items-start md:items-center mb-8 flex-col md:flex-row gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-2 text-[#1E293B]">Quản lý Bài học</h2>
                  <p className="text-sm md:text-base text-gray-500 font-medium">Bạn có thể chọn những bài học nào sẽ hiển thị, và thêm bài học mới.</p>
                </div>
                <button 
                  onClick={() => {
                    const newLesson: GameDef = {
                      id: `l_${Date.now()}`,
                      title: '',
                      description: '',
                      type: 'multiplechoice',
                      icon: '📚',
                      theme: 'blue',
                      isActive: true
                    };
                    setEditingGameMeta({ game: newLesson, isNew: true });
                  }}
                  className="bg-purple-600 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 shadow-sm"
                >
                  <Plus className="w-5 h-5" /> Thêm bài học mới
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 {games.map(game => (
                   <div key={game.id} className={`bg-white p-4 sm:p-5 rounded-2xl border-4 flex flex-col gap-4 transition-colors ${game.isActive !== false ? 'border-purple-200 hover:border-purple-300' : 'border-gray-200 opacity-80'} overflow-hidden shadow-sm`}>
                      
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="text-4xl w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border-2 border-gray-100">
                          {game.icon}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center min-h-[4rem] sm:min-h-[5rem]">
                           <div className="flex items-center gap-2 mb-1 flex-wrap">
                             <h3 className="font-black text-[#1E293B] text-lg sm:text-xl truncate">{game.title}</h3>
                             {game.videoUrl && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] sm:text-xs font-black uppercase rounded-full shrink-0 flex items-center gap-1"><Video className="w-3 h-3"/> Có Video</span>}
                           </div>
                           <p className="text-gray-500 font-medium text-xs sm:text-sm line-clamp-2">{game.description || 'Chưa có mô tả...'}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t-2 border-gray-50">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleToggleGame(game.id)} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-bold text-sm transition-colors border-2 ${game.isActive !== false ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                            {game.isActive !== false ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            {game.isActive !== false ? 'Đang Bật' : 'Đang Tắt'}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setDeletingGame(game)} className="p-2 sm:px-3 sm:py-2 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-xl transition-colors border border-red-100 shrink-0" title="Xoá bài học">
                            <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                          </button>
                          <button onClick={() => setEditingGameMeta({ game, isNew: false })} className="flex-1 sm:flex-none p-2 sm:px-3 sm:py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-bold text-sm flex items-center justify-center gap-1.5 border border-slate-200">
                            <Edit3 className="w-4 h-4" /> <span className="sm:inline">Sửa</span>
                          </button>
                          <button onClick={() => setEditingGame(game)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-xl font-black transition-all text-sm shadow-sm border border-purple-200">
                            <BookOpen className="w-4 h-4" /> Nội Dung
                          </button>
                        </div>
                      </div>

                   </div>
                 ))}
              </div>
            </div>
          )}

          {activeTab === 'manage_students' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-2 text-[#1E293B]">Quản lý học sinh</h2>
                  <p className="text-sm md:text-base text-gray-500 font-medium">Thêm, sửa thành tích và danh sách học sinh.</p>
                </div>
                <button 
                  onClick={() => {
                    setNewStudentName('');
                    setIsAddStudentModalOpen(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5" /> Thêm học sinh
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {studentsList.map(student => {
                  const studentStars = getStoreData(`hvtv_stars_${student.id}`, student.stars);
                  const AVATARS = ['👦🏻','👦🏽','👦🏼','👦🏿','👧🏻','👧🏽','👧🏼','👧🏿','🧒🏻','🧒🏽','👨‍🎓','👩‍🎓','🦊','🐯','🐼','🦁','🐸','🐧','🦋','🌟','🚀','🎮','⚽','🎨','🎸'];
                  const COLORS = [
                    'bg-blue-100 border-blue-400 text-blue-700',
                    'bg-green-100 border-green-400 text-green-700',
                    'bg-orange-100 border-orange-400 text-orange-700',
                    'bg-pink-100 border-pink-400 text-pink-700',
                    'bg-purple-100 border-purple-400 text-purple-700',
                    'bg-red-100 border-red-400 text-red-700',
                    'bg-teal-100 border-teal-400 text-teal-700',
                    'bg-yellow-100 border-yellow-400 text-yellow-700',
                  ];
                  const isPickerOpen = openPickerId === student.id;
                  return (
                    <div key={student.id} className="bg-white p-5 rounded-3xl border-4 border-gray-200 flex flex-col gap-4 shadow-sm">
                      {/* Avatar + Name */}
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <button
                            onClick={() => setOpenPickerId(isPickerOpen ? null : student.id)}
                            className="text-4xl w-16 h-16 rounded-2xl bg-gray-50 border-2 border-gray-200 hover:border-purple-400 flex items-center justify-center transition-colors"
                            title="Đổi icon"
                          >
                            {student.avatar}
                          </button>
                          {isPickerOpen && (
                            <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-2xl border-2 border-purple-200 shadow-xl p-3 w-56">
                              <p className="text-xs text-gray-400 font-bold mb-2 uppercase">Chọn icon</p>
                              <div className="grid grid-cols-5 gap-1.5 mb-3">
                                {AVATARS.map(av => (
                                  <button
                                    key={av}
                                    onClick={async () => {
                                      const allUsers = getUsers().map(u => u.id === student.id ? { ...u, avatar: av } : u);
                                      setStudentsList(allUsers.filter(u => u.role === 'student'));
                                      setOpenPickerId(null);
                                      await withSaving(() => saveUsers(allUsers));
                                    }}
                                    className={`text-2xl w-9 h-9 rounded-xl flex items-center justify-center hover:bg-purple-50 transition-colors ${student.avatar === av ? 'bg-purple-100 ring-2 ring-purple-400' : ''}`}
                                  >{av}</button>
                                ))}
                              </div>
                              <div className="border-t border-gray-100 pt-2">
                                <p className="text-xs text-gray-400 font-bold mb-1">Màu thẻ:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {COLORS.map((c, ci) => (
                                    <button
                                      key={ci}
                                      onClick={async () => {
                                        const allUsers = getUsers().map(u => u.id === student.id ? { ...u, color: c } : u);
                                        setStudentsList(allUsers.filter(u => u.role === 'student'));
                                        await withSaving(() => saveUsers(allUsers));
                                      }}
                                      className={`w-6 h-6 rounded-full border-2 ${c.split(' ')[0]} ${student.color === c ? 'ring-2 ring-offset-1 ring-purple-500' : 'border-gray-300'}`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={student.name}
                            onChange={(e) => {
                               const allUsers = getUsers().map(u => u.id === student.id ? { ...u, name: e.target.value } : u);
                               setStudentsList(allUsers.filter(u => u.role === 'student'));
                               debouncedSaveUsers(allUsers.filter(u => u.role === 'student'));
                             }}
                            className="font-bold text-xl w-full border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none transition-colors bg-transparent"
                          />
                          <div className="text-xs text-gray-400 font-bold uppercase mt-0.5">Học sinh</div>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-2 border border-amber-100">
                        <span className="text-xs font-black text-amber-600 uppercase">Điểm sao</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setStoreData(`hvtv_stars_${student.id}`, Math.max(0, studentStars - 10)); setStudentsList([...studentsList]); }}
                            className="w-7 h-7 bg-red-100 text-red-600 rounded-lg flex items-center justify-center font-black hover:bg-red-200"
                          >−</button>
                          <span className="font-black text-amber-600 min-w-[3rem] text-center">{studentStars} ⭐</span>
                          <button
                            onClick={() => { setStoreData(`hvtv_stars_${student.id}`, studentStars + 10); setStudentsList([...studentsList]); }}
                            className="w-7 h-7 bg-green-100 text-green-600 rounded-lg flex items-center justify-center font-black hover:bg-green-200"
                          >+</button>
                        </div>
                      </div>

                      {/* Errors + Delete */}
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
                          Lỗi: {Object.values(getStoreData<Record<string,number>>(`hvtv_wrong_${student.id}`, {})).reduce((a,b)=>a+b, 0)} câu
                        </div>
                        <button
                           onClick={() => setDeletingStudent(student)}
                           className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                         >
                           <Trash2 className="w-5 h-5" />
                         </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'content' && !editingGame && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-3xl font-black mb-2 text-[#1E293B]">Soạn câu hỏi</h2>
              <p className="text-gray-500 mb-8 font-medium">Chọn bài học bên dưới để xem và thêm nội dung câu hỏi (các dạng thử thách).</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {games.map(game => {
                   const qsCount = appContent?.challenges.filter(c => c.lessonId === game.id).reduce((sum, c) => {
                     return sum + 
                       (appContent?.multiplechoice?.[c.id]?.length || 0) + 
                       (appContent?.fillblank?.[c.id]?.length || 0) + 
                       (appContent?.matchword?.[c.id]?.length || 0) + 
                       (appContent?.reorder?.[c.id]?.length || 0) + 
                       (appContent?.truefalse?.[c.id]?.length || 0) + 
                       (appContent?.typing?.[c.id]?.length || 0);
                   }, 0) || 0;

                   return (
                     <div key={game.id} onClick={() => setEditingGame(game)} className="bg-white p-4 rounded-2xl border-2 border-gray-200 flex items-center justify-between hover:border-purple-300 transition-colors cursor-pointer group shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{game.icon}</span>
                          <div>
                            <div className="font-bold text-[#1E293B]">{game.title}</div>
                            <div className="text-xs text-gray-400 font-bold uppercase">{qsCount} Câu hỏi / Thử thách</div>
                          </div>
                        </div>
                        <div className="bg-gray-100 p-2 rounded-xl group-hover:bg-purple-100 transition-colors">
                          <Edit3 className="w-5 h-5 text-gray-500 group-hover:text-purple-600" />
                        </div>
                     </div>
                   );
                 })}
              </div>
            </motion.div>
          )}

          {activeTab === 'content' && editingGame && !editingChallenge && appContent && (
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <button onClick={() => setEditingGame(null)} className="px-4 py-2 bg-white rounded-full font-bold border-2 border-gray-200 hover:bg-gray-100 flex items-center gap-2 shrink-0">
                    Trở lại
                  </button>
                  <h2 className="text-xl md:text-3xl font-black text-[#1E293B] truncate">Bài học: {editingGame.title}</h2>
                </div>
                <button 
                  onClick={async () => {
                    const newContent = { ...appContent };
                    const newChallenge = {
                      id: `c_${Date.now()}`,
                      lessonId: editingGame.id,
                      title: 'Thử thách mới'
                    };
                    newContent.challenges = [...newContent.challenges, newChallenge];
                    setAppContent(newContent);
                    await withSaving(() => saveAppContent(newContent));
                  }}
                  className="bg-purple-600 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 shadow-sm"
                >
                  <Plus className="w-5 h-5" /> Thêm thử thách
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appContent.challenges.filter(c => c.lessonId === editingGame.id).map(challenge => {
                  const qsCount = 
                     (appContent?.multiplechoice?.[challenge.id]?.length || 0) + 
                     (appContent?.fillblank?.[challenge.id]?.length || 0) + 
                     (appContent?.matchword?.[challenge.id]?.length || 0) + 
                     (appContent?.reorder?.[challenge.id]?.length || 0) + 
                     (appContent?.truefalse?.[challenge.id]?.length || 0) + 
                     (appContent?.typing?.[challenge.id]?.length || 0);

                  return (
                    <div key={challenge.id} className="bg-white p-4 rounded-2xl border-2 border-gray-200 flex flex-col gap-3 shadow-sm group">
                      <div className="flex justify-between items-center">
                        <input
                          value={challenge.title}
                          onChange={(e) => {
                             const newContent = {...appContent};
                             const cRef = newContent.challenges.find(c => c.id === challenge.id);
                             if (cRef) cRef.title = e.target.value;
                             setAppContent(newContent);
                             debouncedSaveContent(newContent);
                          }}
                          className="font-bold text-xl w-full border-b-2 border-transparent hover:border-gray-200 focus:outline-none focus:border-purple-400 font-sans"
                        />
                      </div>
                      <div className="text-sm text-gray-500 font-bold mb-2 uppercase">{qsCount} Câu hỏi</div>
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => setDeletingChallenge(challenge)}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg flex-1 border-2 border-transparent focus:outline-none flex justify-center"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button onClick={() => setEditingChallenge(challenge.id)} className="bg-purple-100 text-purple-700 px-4 py-2 flex items-center justify-center rounded-lg font-bold hover:bg-purple-200 flex-[3]">Soạn câu hỏi</button>
                      </div>
                    </div>
                  );
                })}
                {appContent.challenges.filter(c => c.lessonId === editingGame.id).length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-500 font-bold">Chưa có thử thách nào. Hãy thêm thử thách để bắt đầu soạn câu hỏi.</div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'content' && editingGame && editingChallenge && appContent && (
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
                <button onClick={() => setEditingChallenge(null)} className="px-4 py-2 bg-white rounded-full font-bold border-2 border-gray-200 hover:bg-gray-100 shrink-0">
                  Trở lại
                </button>
                <h2 className="text-xl md:text-3xl font-black text-[#1E293B] truncate">Nội dung: {appContent.challenges.find(c => c.id === editingChallenge)?.title}</h2>
              </div>

              <div className="bg-white p-8 rounded-3xl border-4 border-gray-200 shadow-sm">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl mb-6 border-2 border-gray-100 flex-wrap gap-2">
                  <span className="font-bold text-gray-600 uppercase text-sm">Thêm câu hỏi mới:</span>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => handleAddQuestion('multiplechoice')} className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-200 text-sm border-2 border-purple-200">+ Trắc nghiệm</button>
                    <button onClick={() => handleAddQuestion('fillblank')} className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg font-bold hover:bg-orange-200 text-sm border-2 border-orange-200">+ Điền khuyết</button>
                    <button onClick={() => handleAddQuestion('matchword')} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200 text-sm border-2 border-blue-200">+ Nối từ</button>
                    <button onClick={() => handleAddQuestion('reorder')} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold hover:bg-green-200 text-sm border-2 border-green-200">+ Xếp câu</button>
                    <button onClick={() => handleAddQuestion('truefalse')} className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg font-bold hover:bg-rose-200 text-sm border-2 border-rose-200">+ Đúng/Sai</button>
                    <button onClick={() => handleAddQuestion('typing')} className="bg-teal-100 text-teal-700 px-3 py-1.5 rounded-lg font-bold hover:bg-teal-200 text-sm border-2 border-teal-200">+ Gõ từ</button>
                  </div>
                </div>

                <div className="space-y-6">
                  {['multiplechoice', 'fillblank', 'matchword', 'reorder', 'truefalse', 'typing'].map(type => {
                    const t = type as keyof AppData;
                    const questions = appContent[t]?.[editingChallenge] || [];
                    if (questions.length === 0) return null;
                    return (
                      <div key={t}>
                        <h3 className="font-bold text-lg mb-3 uppercase text-gray-400 border-b-2 border-gray-100 pb-2">{
                           t === 'multiplechoice' ? 'Trắc nghiệm' :
                           t === 'fillblank' ? 'Điền khuyết' :
                           t === 'matchword' ? 'Nối từ' :
                           t === 'reorder' ? 'Xếp câu' :
                           t === 'truefalse' ? 'Đúng/Sai' : 'Gõ từ'
                        }</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {questions.map((q: any, idx: number) => (
                            <div key={idx} className="p-4 bg-white rounded-2xl shadow-sm border-2 border-gray-100 flex flex-col gap-3 relative group hover:border-purple-300 transition-all">
                               <div className="flex justify-between items-start">
                                 <div className="flex items-center gap-2">
                                   <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-sm">
                                      {idx + 1}
                                   </div>
                                   <span className="font-bold text-gray-700 text-sm uppercase">Câu hỏi</span>
                                 </div>
                                 <div className="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => setPreviewingQuestionModal({ type: t, index: idx })} className="p-1.5 bg-blue-50 text-blue-500 hover:bg-blue-200 rounded-lg transition-colors border border-blue-100" title="Xem chi tiết">
                                      <Maximize2 className="w-4 h-4" />
                                   </button>
                                   <button onClick={() => setEditingQuestionModal({ type: t, index: idx })} className="p-1.5 bg-slate-50 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200" title="Sửa">
                                      <Edit3 className="w-4 h-4" />
                                   </button>
                                   <button onClick={() => handleRemoveQuestion(t, idx)} className="p-1.5 bg-red-50 text-red-500 hover:bg-red-200 rounded-lg transition-colors border border-red-100" title="Xoá">
                                      <Trash2 className="w-4 h-4" />
                                   </button>
                                 </div>
                               </div>
                               
                               <div className="text-sm font-medium text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                 {t === 'multiplechoice' && (
                                   <div className="line-clamp-2 whitespace-pre-wrap">{q.question || <span className="text-gray-400 italic">Chưa nhập câu hỏi</span>}</div>
                                 )}
                                 {t === 'fillblank' && (
                                   <div className="line-clamp-2 whitespace-pre-wrap">
                                     {q.sentenceBefore || ''} <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-bold mx-1">...</span> {q.sentenceAfter || ''}
                                   </div>
                                 )}
                                 {t === 'matchword' && (
                                   <div className="flex flex-wrap gap-1">
                                      {(q || []).slice(0, 3).map((p:any, i:number) => (
                                        <span key={i} className="px-2 py-1 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-bold">{p.left} - {p.right}</span>
                                      ))}
                                      {(q || []).length > 3 && <span className="text-xs text-gray-400 mt-1">+{q.length - 3} cặp nữa</span>}
                                   </div>
                                 )}
                                 {t === 'reorder' && (
                                   <div className="flex flex-wrap gap-1">
                                      {(q.words || []).map((w:string, i:number) => (
                                        <span key={i} className="px-2 py-1 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-xs font-bold">{w}</span>
                                      ))}
                                   </div>
                                 )}
                                 {t === 'truefalse' && (
                                   <div className="line-clamp-2 flex flex-col gap-1 whitespace-pre-wrap">
                                     <span>{q.statement || <span className="text-gray-400 italic">Chưa nhập nhận định</span>}</span>
                                     <span className={`text-xs font-black inline-block px-2 py-0.5 rounded w-max mt-1 ${q.isTrue ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{q.isTrue ? 'ĐÚNG' : 'SAI'}</span>
                                   </div>
                                 )}
                                 {t === 'typing' && (
                                   <div className="flex flex-col gap-1">
                                      <span className="font-black text-lg text-purple-600">{q.word || <span className="text-gray-400 italic text-sm">Chưa nhập từ</span>}</span>
                                      {q.hint && <span className="text-xs text-gray-400">Gợi ý: {q.hint}</span>}
                                   </div>
                                 )}
                               </div>
                            </div>
                           ))}
                        </div>
                      </div>
                    );
                  })}
                  
                  {(!appContent.multiplechoice[editingChallenge]?.length && 
                    !appContent.fillblank[editingChallenge]?.length && 
                    !appContent.matchword[editingChallenge]?.length && 
                    !appContent.reorder[editingChallenge]?.length &&
                    !appContent.truefalse[editingChallenge]?.length &&
                    !appContent.typing[editingChallenge]?.length) && (
                    <div className="text-center p-8 bg-gray-50 rounded-2xl text-gray-500 font-medium border-2 border-dashed border-gray-200">
                      Chưa có câu hỏi nào. Hãy thêm câu hỏi ở các nút phía trên.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* QUESTION EDITOR MODAL */}
          <AnimatePresence>
          {editingQuestionModal && appContent && editingChallenge && (() => {
            const { type, index } = editingQuestionModal;
            const q = (appContent[type] as any)[editingChallenge]?.[index];
            if (!q) return null;

            return (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden text-left">
                   <div className="p-6 border-b-2 border-gray-100 flex justify-between items-center bg-gray-50">
                     <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Chỉnh sửa câu hỏi</h3>
                     <button onClick={() => { setEditingQuestionModal(null); setAppContent(getAppContent()); }} className="p-2 bg-white rounded-full hover:bg-gray-200 text-gray-500"><X className="w-6 h-6"/></button>
                   </div>
                   <div className="p-6 overflow-y-auto flex-1">
                      {type === 'multiplechoice' && (
                        <div className="flex flex-col gap-4">
                           <div>
                             <label className="font-bold text-gray-600 mb-1 block">Nội dung câu hỏi</label>
                             <textarea rows={3} value={q.question} onChange={(e) => updateQuestion(type, index, { ...q, question: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-purple-500 outline-none whitespace-pre-wrap resize-none" />
                           </div>
                           <div>
                             <label className="font-bold text-gray-600 mb-1 block">Các lựa chọn (cách nhau bằng phẩy)</label>
                             <input value={(q.options || []).join(', ')} onChange={(e) => updateQuestion(type, index, { ...q, options: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none" />
                           </div>
                           <div>
                             <label className="font-bold text-green-600 mb-1 block">Đáp án đúng</label>
                             <input value={q.answer} onChange={(e) => updateQuestion(type, index, { ...q, answer: e.target.value })} className="w-full p-3 border-2 border-green-200 rounded-xl font-bold focus:border-green-500 outline-none" />
                           </div>
                        </div>
                      )}
                      
                      {type === 'fillblank' && (
                        <div className="flex flex-col gap-4">
                           <div className="grid grid-cols-2 gap-4">
                             <div>
                               <label className="font-bold text-gray-600 mb-1 block">Trước ô trống</label>
                               <textarea rows={3} value={q.sentenceBefore} onChange={(e) => updateQuestion(type, index, { ...q, sentenceBefore: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-purple-500 outline-none whitespace-pre-wrap resize-none" />
                             </div>
                             <div>
                               <label className="font-bold text-gray-600 mb-1 block">Sau ô trống</label>
                               <textarea rows={3} value={q.sentenceAfter} onChange={(e) => updateQuestion(type, index, { ...q, sentenceAfter: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-purple-500 outline-none whitespace-pre-wrap resize-none" />
                             </div>
                           </div>
                           <div>
                             <label className="font-bold text-gray-600 mb-1 block">Các lựa chọn sai (cách nhau bằng phẩy)</label>
                             <input value={(q.options || []).join(', ')} onChange={(e) => updateQuestion(type, index, { ...q, options: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none" />
                           </div>
                           <div>
                             <label className="font-bold text-green-600 mb-1 block">Đáp án đúng</label>
                             <input value={q.answer} onChange={(e) => updateQuestion(type, index, { ...q, answer: e.target.value })} className="w-full p-3 border-2 border-green-200 rounded-xl font-bold focus:border-green-500 outline-none" />
                           </div>
                        </div>
                      )}

                      {type === 'matchword' && (
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl border-2 border-blue-100">
                               <span className="font-bold text-blue-700">Các cặp từ</span>
                               <button onClick={() => {
                                 const newLevel = [...q, { id: Date.now().toString(), left: 'Từ', right: 'Nghĩa' }];
                                 updateQuestion(type, index, newLevel);
                               }} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700">+ Thêm cặp</button>
                            </div>
                            <div className="space-y-3">
                               {q.map((pair: any, pIdx: number) => (
                                 <div key={pIdx} className="flex gap-2 items-center">
                                    <input value={pair.left} onChange={(e) => {
                                      const newLevel = [...q];
                                      newLevel[pIdx] = { ...pair, left: e.target.value };
                                      updateQuestion(type, index, newLevel);
                                    }} className="flex-1 p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-purple-500 outline-none" />
                                    <span className="font-bold text-gray-300">-</span>
                                    <input value={pair.right} onChange={(e) => {
                                      const newLevel = [...q];
                                      newLevel[pIdx] = { ...pair, right: e.target.value };
                                      updateQuestion(type, index, newLevel);
                                    }} className="flex-1 p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-purple-500 outline-none" />
                                    <button onClick={() => {
                                      const newLevel = [...q];
                                      newLevel.splice(pIdx, 1);
                                      updateQuestion(type, index, newLevel);
                                    }} className="p-3 border-2 border-red-100 text-red-500 rounded-xl hover:bg-red-50"><Trash2 className="w-5 h-5"/></button>
                                 </div>
                               ))}
                            </div>
                        </div>
                      )}

                      {type === 'reorder' && (
                        <div className="flex flex-col gap-4">
                           <div>
                             <label className="font-bold text-gray-600 mb-1 block">Các từ (cách nhau bằng khoảng trắng)</label>
                             <input value={(q.words || []).join(' ')} onChange={(e) => updateQuestion(type, index, { ...q, words: e.target.value.split(' ').filter(Boolean) })} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none" />
                           </div>
                           <div>
                             <label className="font-bold text-green-600 mb-1 block">Thứ tự đúng (cách nhau khoảng trắng)</label>
                             <input value={(q.correctOrder || []).join(' ')} onChange={(e) => updateQuestion(type, index, { ...q, correctOrder: e.target.value.split(' ').filter(Boolean) })} className="w-full p-3 border-2 border-green-200 rounded-xl font-bold focus:border-green-500 outline-none" />
                           </div>
                        </div>
                      )}

                      {type === 'truefalse' && (
                        <div className="flex flex-col gap-4">
                           <div>
                             <label className="font-bold text-gray-600 mb-1 block">Nhận định</label>
                             <textarea rows={3} value={q.statement} onChange={(e) => updateQuestion(type, index, { ...q, statement: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-purple-500 outline-none whitespace-pre-wrap resize-none" />
                           </div>
                           <div>
                             <label className="font-bold text-gray-600 mb-2 block">Đáp án</label>
                             <div className="flex gap-4">
                               <button onClick={() => updateQuestion(type, index, { ...q, isTrue: true })} className={`flex-1 p-4 rounded-xl font-black text-xl border-4 transition-colors ${q.isTrue ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-200 text-gray-400 hover:border-green-200'}`}>ĐÚNG</button>
                               <button onClick={() => updateQuestion(type, index, { ...q, isTrue: false })} className={`flex-1 p-4 rounded-xl font-black text-xl border-4 transition-colors ${!q.isTrue ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 text-gray-400 hover:border-red-200'}`}>SAI</button>
                             </div>
                           </div>
                        </div>
                      )}

                      {type === 'typing' && (
                        <div className="flex flex-col gap-4">
                           <div>
                             <label className="font-bold text-gray-600 mb-1 block">Từ cần gõ</label>
                             <input value={q.word} onChange={(e) => updateQuestion(type, index, { ...q, word: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl font-black text-2xl focus:border-purple-500 outline-none" />
                           </div>
                           <div>
                             <label className="font-bold text-gray-600 mb-1 block">Gợi ý</label>
                             <input value={q.hint} onChange={(e) => updateQuestion(type, index, { ...q, hint: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none" />
                           </div>
                        </div>
                      )}
                   </div>
                   <div className="p-6 border-t-2 border-gray-100 bg-gray-50 flex justify-end">
                     <button onClick={() => { setEditingQuestionModal(null); if (appContent) withSaving(() => saveAppContent(appContent)); }} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">Lưu Lại & Đóng</button>
                   </div>
                </motion.div>
              </motion.div>
            );
          })()}
          </AnimatePresence>

          <AnimatePresence>
            {isAddStudentModalOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                  <div className="p-6 border-b-2 border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-black text-2xl text-gray-800">Thêm học sinh mới</h3>
                    <button onClick={() => setIsAddStudentModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><X className="w-6 h-6"/></button>
                  </div>
                  <div className="p-6">
                    <label className="font-bold text-gray-600 mb-2 block">Tên học sinh</label>
                    <input 
                      autoFocus
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && newStudentName.trim()) {
                          const newId = `guest_${Date.now()}`;
                          const avatarList = ['👦🏻','👦🏽','👦🏼','👧🏻','👧🏽','👧🏼','🧒🏻','🧒🏽'];
                          const colorList = ['bg-blue-100 border-blue-400 text-blue-700','bg-green-100 border-green-400 text-green-700','bg-orange-100 border-orange-400 text-orange-700','bg-pink-100 border-pink-400 text-pink-700','bg-teal-100 border-teal-400 text-teal-700'];
                          const idx = studentsList.length % avatarList.length;
                          const newStudent = { id: newId, name: newStudentName.trim(), role: 'student' as const, avatar: avatarList[idx], color: colorList[idx % colorList.length], stars: 0 };
                          const allUsers = [...getUsers(), newStudent];
                          setStudentsList(allUsers.filter(u => u.role === 'student'));
                          await withSaving(() => saveUsers(allUsers));
                          setIsAddStudentModalOpen(false);
                        }
                      }}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl font-bold text-xl focus:border-blue-500 outline-none transition-colors" 
                      placeholder="Nhập tên..." 
                    />
                  </div>
                  <div className="p-6 border-t-2 border-gray-100 bg-gray-50 flex gap-3 justify-end">
                    <button onClick={() => setIsAddStudentModalOpen(false)} className="px-6 py-3 text-gray-600 font-bold rounded-xl hover:bg-gray-200">Hủy</button>
                    <button 
                      disabled={!newStudentName.trim()}
                      onClick={async () => {
                        if (!newStudentName.trim()) return;
                        const newId = `guest_${Date.now()}`;
                        const avatarList = ['👦🏻','👦🏽','👦🏼','👧🏻','👧🏽','👧🏼','🧒🏻','🧒🏽'];
                        const colorList = ['bg-blue-100 border-blue-400 text-blue-700','bg-green-100 border-green-400 text-green-700','bg-orange-100 border-orange-400 text-orange-700','bg-pink-100 border-pink-400 text-pink-700','bg-teal-100 border-teal-400 text-teal-700'];
                        const idx = studentsList.length % avatarList.length;
                        const newStudent = { id: newId, name: newStudentName.trim(), role: 'student' as const, avatar: avatarList[idx], color: colorList[idx % colorList.length], stars: 0 };
                        const allUsers = [...getUsers(), newStudent];
                        setStudentsList(allUsers.filter(u => u.role === 'student'));
                        await withSaving(() => saveUsers(allUsers));
                        setIsAddStudentModalOpen(false);
                      }} 
                      className="px-6 py-3 bg-blue-600 disabled:opacity-50 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg transition-all hover:-translate-y-1"
                    >
                      Thêm
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
            {editingGameMeta && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden text-left">
                  <div className="p-6 border-b-2 border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-black text-xl sm:text-2xl text-gray-800 uppercase tracking-tight">{editingGameMeta.isNew ? 'Thêm bài học mới' : 'Sửa bài học'}</h3>
                    <button onClick={() => setEditingGameMeta(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><X className="w-6 h-6"/></button>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
                    <div>
                      <label className="font-bold text-gray-600 mb-1 block">Tên bài học</label>
                      <input 
                        className="font-black text-[#1E293B] text-xl w-full p-3 border-2 border-gray-200 focus:outline-none focus:border-purple-400 rounded-xl" 
                        value={editingGameMeta.game.title}
                        onChange={(e) => setEditingGameMeta({...editingGameMeta, game: {...editingGameMeta.game, title: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="font-bold text-gray-600 mb-1 block">Mô tả bài học</label>
                      <textarea 
                        className="text-gray-500 font-medium text-sm w-full p-3 border-2 border-gray-200 focus:outline-none focus:border-purple-400 rounded-xl resize-none h-24" 
                        value={editingGameMeta.game.description}
                        onChange={(e) => setEditingGameMeta({...editingGameMeta, game: {...editingGameMeta.game, description: e.target.value}})}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="shrink-0">
                        <label className="font-bold text-gray-600 mb-1 block">Biểu tượng</label>
                        <select 
                          className="text-4xl w-full sm:w-20 h-16 bg-gray-50 rounded-xl text-center border-2 border-gray-200 focus:outline-none focus:border-purple-400 appearance-none cursor-pointer" 
                          value={editingGameMeta.game.icon}
                          onChange={(e) => setEditingGameMeta({...editingGameMeta, game: {...editingGameMeta.game, icon: e.target.value}})}
                        >
                          {['📚', '✍️', '🎮', '🧩', '🚀', '🌟', '🎨', '🔥', '🏆', '💡', '⏰', '🌈', '🚲', '🍎', '🐱', '🐶', '⚽️', '🏀', '🎸', '🎹'].map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="font-bold text-gray-600 mb-1 block">Video giới thiệu</label>
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            placeholder="Dán link YouTube, Google Drive..."
                            className="text-sm p-3 border-2 border-gray-200 rounded-xl w-full bg-white focus:border-purple-400 outline-none min-w-0"
                            value={editingGameMeta.game.videoUrl || ''}
                            onChange={(e) => setEditingGameMeta({...editingGameMeta, game: {...editingGameMeta.game, videoUrl: e.target.value}})}
                          />
                          <label className="flex items-center justify-center gap-1.5 text-sm bg-blue-100 text-blue-700 px-4 py-3 rounded-xl cursor-pointer hover:bg-blue-200 font-black transition-colors w-full border border-blue-200">
                            {uploadingVideoId === editingGameMeta.game.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />} Tải file video lên
                            <input 
                              type="file" 
                              accept="video/mp4,video/webm,video/ogg,video/quicktime" 
                              className="hidden" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if(!file) return;
                                try {
                                  setUploadingVideoId(editingGameMeta.game.id);
                                  const ext = file.name.split('.').pop();
                                  const fileName = `${editingGameMeta.game.id}_${Date.now()}.${ext}`;
                                  const { error: uploadError } = await supabase.storage.from('videos').upload(fileName, file, { upsert: true });
                                  if (uploadError) throw uploadError;
                                  const { data } = supabase.storage.from('videos').getPublicUrl(fileName);
                                  setEditingGameMeta({...editingGameMeta, game: {...editingGameMeta.game, videoUrl: data.publicUrl}});
                                } catch (err: any) {
                                  alert('Lỗi tải lên video: ' + err.message);
                                } finally {
                                  setUploadingVideoId(null);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 border-t-2 border-gray-100 bg-gray-50 flex gap-3 justify-end">
                    <button onClick={() => setEditingGameMeta(null)} className="px-6 py-3 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">Hủy</button>
                    <button 
                      onClick={async () => {
                        let updated;
                        if (editingGameMeta.isNew) {
                          updated = [...games, editingGameMeta.game];
                        } else {
                          updated = games.map(g => g.id === editingGameMeta.game.id ? editingGameMeta.game : g);
                        }
                        setGames(updated);
                        await withSaving(() => saveGames(updated));
                        setEditingGameMeta(null);
                      }} 
                      className={`px-6 py-3 ${editingGameMeta.isNew ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'} text-white font-black rounded-xl shadow-lg transition-all hover:-translate-y-1`}
                    >
                      {editingGameMeta.isNew ? 'Tạo Bài Học' : 'Lưu Thay Đổi'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {deletingGame && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
                  <div className="p-6 flex flex-col items-center text-center pt-8">
                    <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                      <Trash2 className="w-10 h-10" />
                    </div>
                    <h3 className="font-black text-2xl text-gray-800 mb-2">Xóa bài học này?</h3>
                    <p className="text-gray-500 font-medium">Bạn có chắc chắn muốn xóa bài học "<span className="text-gray-800 font-bold">{deletingGame.title}</span>"? Hành động này không thể hoàn tác.</p>
                  </div>
                  <div className="p-4 bg-gray-50 flex gap-3 justify-center border-t-2 border-gray-100">
                    <button onClick={() => setDeletingGame(null)} className="flex-1 py-3 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">Hủy</button>
                    <button 
                      onClick={async () => {
                        const updated = games.filter(g => g.id !== deletingGame.id);
                        setGames(updated); 
                        await withSaving(() => saveGames(updated));
                        await deleteChallenge(deletingGame.id);
                        setDeletingGame(null);
                      }} 
                      className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl shadow-lg transition-all hover:-translate-y-1"
                    >
                      Xóa ngay
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {deletingStudent && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
                  <div className="p-6 flex flex-col items-center text-center pt-8">
                    <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                      <Trash2 className="w-10 h-10" />
                    </div>
                    <h3 className="font-black text-2xl text-gray-800 mb-2">Xóa học sinh này?</h3>
                    <p className="text-gray-500 font-medium">Bạn có chắc chắn muốn xóa học sinh "<span className="text-gray-800 font-bold">{deletingStudent.name}</span>"? Hành động này không thể hoàn tác.</p>
                  </div>
                  <div className="p-4 bg-gray-50 flex gap-3 justify-center border-t-2 border-gray-100">
                    <button onClick={() => setDeletingStudent(null)} className="flex-1 py-3 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">Hủy</button>
                    <button 
                      onClick={async () => {
                        const allUsers = getUsers().filter(u => u.id !== deletingStudent.id);
                        setStudentsList(allUsers.filter(u => u.role === 'student'));
                        await withSaving(() => saveUsers(allUsers));
                        setDeletingStudent(null);
                      }} 
                      className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl shadow-lg transition-all hover:-translate-y-1"
                    >
                      Xóa ngay
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {deletingChallenge && appContent && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
                  <div className="p-6 flex flex-col items-center text-center pt-8">
                    <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                      <Trash2 className="w-10 h-10" />
                    </div>
                    <h3 className="font-black text-2xl text-gray-800 mb-2">Xóa thử thách?</h3>
                    <p className="text-gray-500 font-medium">Bạn có muốn xóa thử thách "<span className="text-gray-800 font-bold">{deletingChallenge.title}</span>"? Tất cả câu hỏi bên trong sẽ bị xóa và không thể hoàn tác.</p>
                  </div>
                  <div className="p-4 bg-gray-50 flex gap-3 justify-center border-t-2 border-gray-100">
                    <button onClick={() => setDeletingChallenge(null)} className="flex-1 py-3 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">Hủy</button>
                    <button 
                      onClick={async () => {
                        await withSaving(() => deleteChallenge(deletingChallenge.id));
                        const newContent = {...appContent};
                        newContent.challenges = newContent.challenges.filter(c => c.id !== deletingChallenge.id);
                        setAppContent(newContent);
                        setDeletingChallenge(null);
                      }} 
                      className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl shadow-lg transition-all hover:-translate-y-1"
                    >
                      Xóa ngay
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {deletingQuestion && editingChallenge && appContent && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
                  <div className="p-6 flex flex-col items-center text-center pt-8">
                    <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                      <Trash2 className="w-10 h-10" />
                    </div>
                    <h3 className="font-black text-2xl text-gray-800 mb-2">Xóa câu hỏi?</h3>
                    <p className="text-gray-500 font-medium">Bạn có chắc muốn xóa câu hỏi này? Hành động này không thể hoàn tác.</p>
                  </div>
                  <div className="p-4 bg-gray-50 flex gap-3 justify-center border-t-2 border-gray-100">
                    <button onClick={() => setDeletingQuestion(null)} className="flex-1 py-3 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">Hủy</button>
                    <button 
                      onClick={async () => {
                        const newContent = { ...appContent };
                        if ((newContent[deletingQuestion.type] as any)?.[editingChallenge]) {
                          const qArray = (newContent[deletingQuestion.type] as any)[editingChallenge];
                          const deletedQuestion = qArray[deletingQuestion.index];
                          
                          qArray.splice(deletingQuestion.index, 1);
                          setAppContent(newContent);
                          
                          await withSaving(async () => {
                            if (deletedQuestion && deletedQuestion.id) {
                              await supabase.from('questions').delete().eq('id', deletedQuestion.id);
                            }
                            await saveAppContent(newContent);
                          });
                        }
                        setDeletingQuestion(null);
                      }} 
                      className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl shadow-lg transition-all hover:-translate-y-1"
                    >
                      Xóa ngay
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {previewingQuestionModal && editingChallenge && appContent && (() => {
              const { type, index } = previewingQuestionModal;
              const q = (appContent[type] as any)[editingChallenge]?.[index];
              if (!q) return null;
              
              return (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col">
                  <div className="p-6 border-b-2 border-gray-100 flex justify-between items-center bg-blue-50">
                    <h3 className="font-black text-2xl text-blue-800 uppercase tracking-tight flex items-center gap-2"><Maximize2 className="w-6 h-6"/> Xem trước Câu hỏi</h3>
                    <button onClick={() => setPreviewingQuestionModal(null)} className="p-2 hover:bg-blue-200 rounded-full text-blue-500 transition-colors"><X className="w-6 h-6"/></button>
                  </div>
                  <div className="p-8 overflow-y-auto max-h-[70vh] bg-gray-50 flex flex-col gap-6">
                    {/* Render different styles based on type */}
                    {type === 'multiplechoice' && (
                      <div className="flex flex-col gap-6 text-center items-center">
                        <div className="text-2xl font-black text-[#1E293B] bg-white p-6 rounded-3xl shadow-sm border-2 border-blue-100 w-full whitespace-pre-wrap">{q.question}</div>
                        <div className="grid grid-cols-2 gap-4 w-full">
                          {q.options?.map((opt:string, i:number) => (
                            <div key={i} className={`p-4 rounded-2xl font-bold text-lg border-b-4 ${opt === q.answer ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                              {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {type === 'fillblank' && (
                      <div className="flex flex-col gap-6 items-center">
                        <div className="text-2xl font-bold text-[#1E293B] bg-white p-6 rounded-3xl shadow-sm border-2 border-blue-100 w-full text-center whitespace-pre-wrap leading-relaxed">
                          {q.sentenceBefore} <span className="inline-block px-4 py-1 bg-green-100 text-green-700 border-b-4 border-green-300 rounded-2xl font-black mx-2">{q.answer}</span> {q.sentenceAfter}
                        </div>
                        <div className="flex gap-3 flex-wrap justify-center">
                          {q.options?.map((opt:string, i:number) => (
                            <div key={i} className={`px-6 py-3 rounded-2xl font-bold border-b-4 bg-white border-gray-200 text-gray-500`}>
                              {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {type === 'matchword' && (
                      <div className="flex flex-col gap-4">
                        {(q || []).map((p:any, i:number) => (
                          <div key={i} className="flex gap-4 items-center justify-center">
                            <div className="flex-1 p-4 bg-blue-100 text-blue-800 font-bold rounded-2xl border-b-4 border-blue-300 text-center text-lg">{p.left}</div>
                            <div className="w-10 h-1 bg-gray-300 rounded-full" />
                            <div className="flex-1 p-4 bg-green-100 text-green-800 font-bold rounded-2xl border-b-4 border-green-300 text-center text-lg">{p.right}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {type === 'reorder' && (
                      <div className="flex flex-wrap gap-3 justify-center bg-white p-8 rounded-3xl shadow-sm border-2 border-orange-100">
                        {(q.words || []).map((w:string, i:number) => (
                          <div key={i} className="px-6 py-3 bg-orange-100 text-orange-800 font-black text-xl rounded-2xl border-b-4 border-orange-300 shadow-sm cursor-default hover:-translate-y-1 transition-transform">
                            {w}
                          </div>
                        ))}
                        <div className="w-full text-center mt-4 pt-4 border-t-2 border-gray-100 text-gray-400 font-bold">
                          Đáp án đúng: <span className="text-green-600">{(q.correctOrder || q.words || []).join(' ')}</span>
                        </div>
                      </div>
                    )}
                    {type === 'truefalse' && (
                      <div className="flex flex-col gap-6 items-center">
                        <div className="text-3xl font-black text-[#1E293B] bg-white p-8 rounded-3xl shadow-sm border-2 border-blue-100 w-full text-center whitespace-pre-wrap">
                          {q.statement}
                        </div>
                        <div className={`px-12 py-6 rounded-3xl font-black text-4xl border-b-8 shadow-lg ${q.isTrue ? 'bg-green-500 text-white border-green-600' : 'bg-red-500 text-white border-red-600'}`}>
                          {q.isTrue ? 'ĐÚNG' : 'SAI'}
                        </div>
                      </div>
                    )}
                    {type === 'typing' && (
                      <div className="flex flex-col gap-6 items-center text-center">
                        <div className="text-6xl font-black text-purple-600 drop-shadow-md">
                          {q.word}
                        </div>
                        {q.hint && (
                          <div className="px-6 py-3 bg-white border-2 border-purple-100 text-purple-500 font-bold rounded-2xl shadow-sm text-lg">
                            💡 {q.hint}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* ─── Thư viện GIF ─── */}
          {activeTab === 'gif_library' && <GifLibrary />}

          {/* ─── Hiệu ứng & Nhạc nền ─── */}
          {activeTab === 'ambience' && <AmbienceSettings />}
        </main>
      </div>
    </div>
  )
}
