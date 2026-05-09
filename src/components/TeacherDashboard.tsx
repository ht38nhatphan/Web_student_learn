import { useState, useEffect } from 'react';
import { User, GameDef } from '../types';
import { BookOpen, Edit3, LogOut, CheckSquare, Square, Plus, Trash2, Users, X, Volume2, VolumeX, Image, Sparkles, Video, UploadCloud, Loader2 } from 'lucide-react';
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

  // Student management state
  const [studentsList, setStudentsList] = useState<User[]>([]);
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<'saving' | 'done' | 'error' | null>(null);
  const [muted, setMuted] = useState(soundManager.isMuted);

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

  const handleRemoveQuestion = async (gameType: keyof AppData, index: number) => {
    if (!editingChallenge || !appContent) return;
    const newContent = { ...appContent };
    
    if ((newContent[gameType] as any)?.[editingChallenge]) {
      (newContent[gameType] as any)[editingChallenge].splice(index, 1);
      setAppContent(newContent);
      await withSaving(() => saveAppContent(newContent));
    }
  };

  const updateQuestion = async (gameType: keyof AppData, index: number, newQuestionData: any) => {
    if (!editingChallenge || !appContent) return;
    const newContent = { ...appContent };
    if ((newContent[gameType] as any)?.[editingChallenge]) {
      (newContent[gameType] as any)[editingChallenge][index] = newQuestionData;
      setAppContent(newContent);
      await withSaving(() => saveAppContent(newContent));
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
       <nav className="h-20 bg-white border-b-4 border-purple-300 flex items-center justify-between px-8 shrink-0 shadow-sm relative z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg text-2xl">
            {user.avatar}
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-[#1E293B]">Quản lý <span className="text-purple-600">Giáo Viên</span></h1>
            <p className="text-sm font-bold text-gray-500">Xin chào, {user.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { const m = soundManager.toggleMute(); setMuted(m); }}
            title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="p-2 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            {muted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-slate-500" />}
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full font-bold hover:bg-red-100 transition-colors border-2 border-red-200"
          >
            <LogOut className="w-4 h-4" /> Thoát
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
                  <h2 className="text-3xl font-black mb-2 text-[#1E293B]">Quản lý Bài học</h2>
                  <p className="text-gray-500 font-medium">Bạn có thể chọn những bài học nào sẽ hiển thị, và thêm bài học mới.</p>
                </div>
                <button 
                  onClick={async () => {
                    const newLesson: GameDef = {
                      id: `l_${Date.now()}`,
                      title: 'Bài học mới',
                      description: 'Mô tả bài học...',
                      type: 'multiplechoice',
                      icon: '📚',
                      theme: 'blue',
                      isActive: true
                    };
                    const newGames = [...games, newLesson];
                    setGames(newGames);
                    await withSaving(() => saveGames(newGames));
                  }}
                  className="bg-purple-600 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 shadow-sm"
                >
                  <Plus className="w-5 h-5" /> Thêm bài học mới
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 {games.map(game => (
                   <div key={game.id} className={`bg-white p-4 rounded-2xl border-4 flex flex-col md:flex-row gap-4 justify-between transition-colors ${game.isActive !== false ? 'border-purple-200 hover:border-purple-300' : 'border-gray-200 opacity-80'}`}>
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex flex-col gap-2">
                           <select 
                             className="text-4xl w-20 h-16 bg-gray-50 rounded-xl text-center border-2 border-transparent hover:border-gray-200 focus:outline-none focus:border-purple-400 appearance-none cursor-pointer" 
                             value={game.icon}
                             onChange={(e) => {
                               const v = e.target.value;
                               if(v) {
                                 const updated = games.map(g => g.id === game.id ? { ...g, icon: v } : g);
                                 setGames(updated); debouncedSaveGames(updated);
                               }
                             }}
                           >
                             {['📚', '✍️', '🎮', '🧩', '🚀', '🌟', '🎨', '🔥', '🏆', '💡', '⏰', '🌈', '🚲', '🍎', '🐱', '🐶', '⚽️', '🏀', '🎸', '🎹'].map(i => <option key={i} value={i}>{i}</option>)}
                           </select>
                           <button onClick={() => handleToggleGame(game.id)} className="flex items-center justify-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100">
                             {game.isActive !== false ? <CheckSquare className="w-6 h-6 text-green-500" /> : <Square className="w-6 h-6 text-gray-300" />}
                           </button>
                        </div>
                        <div className="flex-1 space-y-2">
                          <input 
                            className="font-bold text-[#1E293B] text-xl w-full border-b-2 border-transparent hover:border-gray-200 focus:outline-none focus:border-purple-400 font-sans" 
                            value={game.title}
                            onChange={(e) => {
                              const updated = games.map(g => g.id === game.id ? { ...g, title: e.target.value } : g);
                              setGames(updated); debouncedSaveGames(updated);
                            }}
                          />
                          <textarea 
                            className="text-gray-500 font-medium text-sm w-full border-2 border-transparent hover:border-gray-200 focus:outline-none focus:border-purple-400 rounded-lg p-2 bg-gray-50 resize-none h-16 line-clamp-2" 
                            value={game.description}
                            onChange={(e) => {
                              const updated = games.map(g => g.id === game.id ? { ...g, description: e.target.value } : g);
                              setGames(updated); debouncedSaveGames(updated);
                            }}
                          />
                          <div className="flex items-center gap-2 mt-2 bg-gray-50 p-2 rounded-lg border-2 border-dashed border-gray-200">
                            <Video className="w-4 h-4 text-gray-400 shrink-0" />
                            <input
                              type="text"
                              placeholder="Dán link YouTube, Google Drive hoặc URL video..."
                              className="text-sm p-1.5 border-2 border-gray-200 rounded-lg flex-1 bg-white focus:border-purple-400 outline-none"
                              value={game.videoUrl || ''}
                              onChange={(e) => {
                                const updated = games.map(g => g.id === game.id ? { ...g, videoUrl: e.target.value } : g);
                                setGames(updated); debouncedSaveGames(updated);
                              }}
                            />
                            {game.videoUrl && (
                              <button
                                onClick={() => {
                                  const updated = games.map(g => g.id === game.id ? { ...g, videoUrl: null } : g);
                                  setGames(updated); debouncedSaveGames(updated);
                                }}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="Xóa video"
                              ><X className="w-4 h-4" /></button>
                            )}
                            <label className="flex items-center gap-1 text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-blue-200 font-bold transition-colors shrink-0">
                              {uploadingVideoId === game.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                              Tải file lên
                              <input 
                                type="file" 
                                accept="video/mp4,video/webm,video/ogg,video/quicktime" 
                                className="hidden" 
                                disabled={uploadingVideoId === game.id}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if(!file) return;
                                  try {
                                    setUploadingVideoId(game.id);
                                    const ext = file.name.split('.').pop();
                                    const fileName = `${game.id}_${Date.now()}.${ext}`;
                                    const { error: uploadError } = await supabase.storage.from('videos').upload(fileName, file, { upsert: true });
                                    if (uploadError) throw uploadError;
                                    const { data } = supabase.storage.from('videos').getPublicUrl(fileName);
                                    const updated = games.map(g => g.id === game.id ? { ...g, videoUrl: data.publicUrl } : g);
                                    setGames(updated); await withSaving(() => saveGames(updated));
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
                      <div className="flex flex-row md:flex-col gap-2 items-center justify-end">
                        <button 
                          onClick={async () => {
                            if(window.confirm('Bạn có chắc muốn xoá bài học này?')) {
                              const updated = games.filter(g => g.id !== game.id);
                              setGames(updated);
                              await withSaving(() => saveGames(updated));
                            }
                          }}
                          className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border-2 border-transparent"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          )}

          {activeTab === 'manage_students' && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black mb-2 text-[#1E293B]">Quản lý học sinh</h2>
                  <p className="text-gray-500 font-medium">Thêm, sửa thành tích và danh sách học sinh.</p>
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
                           onClick={async () => {
                             if(window.confirm('Bạn có chắc muốn xoá học sinh này?')) {
                               const allUsers = getUsers().filter(u => u.id !== student.id);
                               setStudentsList(allUsers.filter(u => u.role === 'student'));
                               await withSaving(() => saveUsers(allUsers));
                             }
                           }}
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
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <button onClick={() => setEditingGame(null)} className="px-4 py-2 bg-white rounded-full font-bold border-2 border-gray-200 hover:bg-gray-100 flex items-center gap-2">
                    Trở lại
                  </button>
                  <h2 className="text-3xl font-black text-[#1E293B]">Bài học: {editingGame.title}</h2>
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
                          onClick={async () => {
                            if(window.confirm('Xoá thử thách này? Tất cả câu hỏi trong thử thách cũng sẽ bị xóa.')) {
                              await withSaving(() => deleteChallenge(challenge.id));
                              const newContent = {...appContent};
                              newContent.challenges = newContent.challenges.filter(c => c.id !== challenge.id);
                              setAppContent(newContent);
                            }
                          }}
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
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setEditingChallenge(null)} className="px-4 py-2 bg-white rounded-full font-bold border-2 border-gray-200 hover:bg-gray-100">
                  Trở lại
                </button>
                <h2 className="text-3xl font-black text-[#1E293B]">Nội dung: {appContent.challenges.find(c => c.id === editingChallenge)?.title}</h2>
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
                            <div key={idx} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between border-2 border-transparent hover:border-purple-200 transition-colors">
                               <div className="flex flex-col">
                                 <span className="font-bold text-gray-700">Câu hỏi #{idx + 1}</span>
                               </div>
                               <div className="flex gap-2">
                                 <button onClick={() => setEditingQuestionModal({ type: t, index: idx })} className="px-3 py-1 bg-white shadow-sm border border-gray-200 rounded-lg text-sm font-bold text-purple-600 hover:bg-purple-50">Sửa</button>
                                 <button onClick={() => handleRemoveQuestion(t, idx)} className="px-3 py-1 bg-white shadow-sm border border-gray-200 text-red-500 rounded-lg text-sm font-bold hover:bg-red-50">Xóa</button>
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
                     <button onClick={() => setEditingQuestionModal(null)} className="p-2 bg-white rounded-full hover:bg-gray-200 text-gray-500"><X className="w-6 h-6"/></button>
                   </div>
                   <div className="p-6 overflow-y-auto flex-1">
                      {type === 'multiplechoice' && (
                        <div className="flex flex-col gap-4">
                           <div>
                             <label className="font-bold text-gray-600 mb-1 block">Nội dung câu hỏi</label>
                             <input value={q.question} onChange={(e) => updateQuestion(type, index, { ...q, question: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-purple-500 outline-none" />
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
                               <input value={q.sentenceBefore} onChange={(e) => updateQuestion(type, index, { ...q, sentenceBefore: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-purple-500 outline-none" />
                             </div>
                             <div>
                               <label className="font-bold text-gray-600 mb-1 block">Sau ô trống</label>
                               <input value={q.sentenceAfter} onChange={(e) => updateQuestion(type, index, { ...q, sentenceAfter: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-purple-500 outline-none" />
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
                             <input value={q.statement} onChange={(e) => updateQuestion(type, index, { ...q, statement: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold focus:border-purple-500 outline-none" />
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
                     <button onClick={() => setEditingQuestionModal(null)} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">Lưu Lại & Đóng</button>
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
