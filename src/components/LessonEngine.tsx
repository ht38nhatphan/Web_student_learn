import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, XCircle, Home, RotateCcw } from 'lucide-react';
import { FillBlankQuestion, MatchPair, MultipleChoiceQuestion, ReorderQuestion, TrueFalseQuestion, TypingQuestion } from '../data/content';
import { ChallengeDef } from '../types';
import { getAppContent, getStoreData, setStoreData } from '../lib/store';
import { soundManager } from '../lib/sound';

// ── Ảnh nền sống động theo loại câu hỏi ─────────────────────────────────────────
// Dùng ảnh đẹp từ picsum.photos (stable seed), và emoji art ấn tượng
const BG_BY_TYPE: Record<string, string[]> = {
  multiplechoice: [
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900&q=80', // students studying
    'https://images.unsplash.com/photo-1588072432836-e10032774350?w=900&q=80', // colorful pencils
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=900&q=80', // books
  ],
  fillblank: [
    'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=900&q=80', // writing
    'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=900&q=80', // pen and paper
    'https://images.unsplash.com/photo-1517842645767-c639042777db?w=900&q=80', // notebook
  ],
  matchword: [
    'https://images.unsplash.com/photo-1555431189-0fabf2179ef9?w=900&q=80', // puzzle
    'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=900&q=80', // colorful blocks
    'https://images.unsplash.com/photo-1484820540004-14229fe36ca4?w=900&q=80', // shapes
  ],
  reorder: [
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=900&q=80', // library
    'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=900&q=80', // open book
    'https://images.unsplash.com/photo-1474932430478-1e6ac2bf0375?w=900&q=80', // word game
  ],
  truefalse: [
    'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=900&q=80', // checkmark
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80', // quiz
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&q=80', // classroom
  ],
  typing: [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80', // keyboard
    'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=900&q=80', // letters
    'https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=900&q=80', // writing desk
  ],
};

function getBgImage(type: string, seed: number): string {
  const pool = BG_BY_TYPE[type] || BG_BY_TYPE.multiplechoice;
  return pool[seed % pool.length];
}

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
      setCorrectCount(c => c + 1);
      setDotColors(prev => { const n = [...prev]; n[currentIndex] = 'correct'; return n; });
      soundManager.play('correct');
      setTimeout(() => soundManager.play('star_gain'), 400);

      const progress = getStoreData<{ completedIds: string[] }>(`hvtv_prog_${userId}_${challenge.id}`, { completedIds: [] });
      let qid = currentItem.type === 'matchword' ? currentItem.data[0].id : currentItem.data.id;
      progress.completedIds.push(qid);
      setStoreData(`hvtv_prog_${userId}_${challenge.id}`, progress);
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

  const handleContinue = () => {
    if (currentIndex < items.length - 1) {
      soundManager.play('question_done');
      setCurrentIndex(prev => prev + 1);
    } else {
      const gained = correctCount * 10;
      const pct = items.length > 0 ? correctCount / items.length : 0;
      if (pct >= 0.8) soundManager.play('victory');
      else soundManager.play('challenge_done');
      setFinalStars(gained);
      setShowEndScreen(true);
      onComplete(gained);
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
    <div className="flex-1 flex flex-col bg-white rounded-3xl overflow-hidden shadow-xl mt-8 relative max-w-4xl mx-auto w-full">
      {/* Header — Dot Progress */}
      <div className="p-5 flex items-center gap-4 border-b-2 border-gray-100">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600"><X className="w-8 h-8" /></button>
        <div className="flex flex-1 items-center justify-center gap-2 flex-wrap">
          {items.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${
              i === currentIndex ? 'w-5 h-5 bg-blue-400 shadow-md animate-pulse' :
              dotColors[i] === 'correct' ? 'w-4 h-4 bg-green-500' :
              dotColors[i] === 'wrong'   ? 'w-4 h-4 bg-red-400' :
              'w-4 h-4 bg-gray-200'
            }`} />
          ))}
        </div>
        <span className="text-sm font-bold text-gray-400 shrink-0">{currentIndex + 1}/{items.length}</span>

        {/* Penalty animation */}
        <AnimatePresence>
          {penaltyAnim && (
            <motion.span initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -30 }}
              exit={{}} transition={{ duration: 0.8 }}
              className="absolute right-20 top-4 text-red-500 font-black text-xl pointer-events-none">-5 ⭐</motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Content Area — với GIF background */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Ảnh nền câu hỏi */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex + '-bg'}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('${getBgImage(currentItem?.type ?? 'multiplechoice', currentIndex)}')`
            }}
          />
        </AnimatePresence>
        {/* Overlay */}
        <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.87)', backdropFilter: 'blur(2px)' }} />

        <div className="relative z-10 p-6 md:p-8 flex flex-col justify-center min-h-full">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIndex}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="w-full max-w-2xl mx-auto flex flex-col gap-8"
          >
            {currentItem?.type === 'multiplechoice' && (
              <>
                <h2 className="text-3xl font-black text-[#1E293B] mb-4">Chọn đáp án đúng</h2>
                <div className="text-xl font-medium text-gray-700 bg-white/90 p-6 rounded-2xl border-2 border-gray-100 border-b-4 mb-4 shadow-sm">
                  {currentItem.data.question}
                </div>
                <div className="flex flex-col gap-3">
                  {currentItem.data.options.map((opt, i) => (
                    <button
                      key={i}
                      disabled={feedback !== null}
                      onClick={() => { setSelectedOption(opt); soundManager.play('select'); }}
                      className={`p-4 rounded-2xl border-2 border-b-4 font-bold text-lg text-left transition-all ${
                        selectedOption === opt
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white/90 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}

            {currentItem?.type === 'fillblank' && (
              <>
                <h2 className="text-3xl font-black text-[#1E293B] mb-4">Điền vào chỗ trống</h2>
                <div className="text-2xl font-bold bg-gray-50 p-8 rounded-3xl border-2 border-gray-100 border-b-4 flex items-center flex-wrap gap-2 justify-center leading-loose">
                  <span>{currentItem.data.sentenceBefore}</span>
                  <div className="min-w-[4rem] h-12 border-b-4 border-gray-300 inline-flex items-end justify-center text-blue-600 px-2 pb-1 bg-white rounded-t-xl">
                    {selectedOption || '___'}
                  </div>
                  <span>{currentItem.data.sentenceAfter}</span>
                </div>
                <div className="flex justify-center gap-4 mt-8">
                  {currentItem.data.options.map((opt, i) => (
                    <button
                      key={i}
                      disabled={feedback !== null}
                      onClick={() => setSelectedOption(opt)}
                      className={`px-8 py-4 rounded-2xl border-2 border-b-4 font-black text-2xl transition-all ${
                        selectedOption === opt
                          ? 'border-blue-400 bg-blue-50 text-blue-700 scale-105'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 outline-none hover:-translate-y-1'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}

            {currentItem?.type === 'truefalse' && (
              <>
                <h2 className="text-3xl font-black text-[#1E293B] mb-4">Đúng hay Sai?</h2>
                <div className="text-2xl font-bold text-gray-700 bg-rose-50 p-8 rounded-3xl border-2 border-rose-100 border-b-4 text-center">
                  "{currentItem.data.statement}"
                </div>
                <div className="grid grid-cols-2 gap-6 mt-8">
                  <button
                    disabled={feedback !== null}
                    onClick={() => setSelectedOption('true')}
                    className={`py-8 rounded-3xl border-2 border-b-8 font-black text-3xl transition-all ${
                      selectedOption === 'true'
                        ? 'border-green-500 bg-green-50 text-green-600'
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-50 text-gray-500'
                    }`}
                  >
                    ĐÚNG
                  </button>
                  <button
                    disabled={feedback !== null}
                    onClick={() => setSelectedOption('false')}
                    className={`py-8 rounded-3xl border-2 border-b-8 font-black text-3xl transition-all ${
                      selectedOption === 'false'
                        ? 'border-red-500 bg-red-50 text-red-600'
                        : 'border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-500'
                    }`}
                  >
                    SAI
                  </button>
                </div>
              </>
            )}

            {currentItem?.type === 'typing' && (
               <>
                 <h2 className="text-3xl font-black text-[#1E293B] mb-4">Gõ lại từ sau</h2>
                 <div className="text-center mb-8">
                   <div className="text-gray-500 font-bold mb-2 uppercase tracking-widest">{currentItem.data.hint}</div>
                   <div className="text-5xl font-black text-[#1E293B] bg-teal-50 py-8 rounded-3xl border-2 border-teal-100">{currentItem.data.word}</div>
                 </div>
                 <input 
                   autoFocus
                   disabled={feedback !== null}
                   value={typedAnswer}
                   onChange={(e) => setTypedAnswer(e.target.value)}
                   className="w-full text-center text-3xl font-bold p-6 bg-gray-50 border-4 border-gray-200 rounded-3xl focus:border-teal-400 focus:outline-none transition-colors"
                   placeholder="Nhập câu trả lời..."
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && !isCheckDisabled() && feedback === null) {
                       handleCheck();
                     } else if (e.key === 'Enter' && feedback !== null) {
                       handleContinue();
                     }
                   }}
                 />
               </>
            )}

            {currentItem?.type === 'reorder' && (
               <>
                 <h2 className="text-3xl font-black text-[#1E293B] mb-4">Xếp thành câu hoàn chỉnh</h2>
                 
                 <div className="min-h-[100px] p-6 bg-gray-50 border-4 border-dashed border-gray-200 rounded-3xl flex flex-wrap gap-3 items-center content-start">
                   {reorderSelected.map((word, i) => (
                     <motion.button
                       layout
                       key={`sel-${i}`}
                       disabled={feedback !== null}
                       onClick={() => {
                         setReorderSelected(prev => prev.filter((_, idx) => idx !== i));
                         setReorderAvailable(prev => [...prev, word]);
                       }}
                       className="px-6 py-3 bg-white border-2 border-gray-200 border-b-4 rounded-xl font-bold text-xl text-gray-700 shadow-sm"
                     >
                       {word}
                     </motion.button>
                   ))}
                   {reorderSelected.length === 0 && (
                     <span className="text-gray-400 font-bold w-full text-center">Bấm vào các từ bên dưới...</span>
                   )}
                 </div>

                 <div className="mt-8 flex flex-wrap justify-center gap-4">
                   {reorderAvailable.map((word, i) => (
                     <motion.button
                       layout
                       key={`avl-${i}`}
                       disabled={feedback !== null}
                       onClick={() => {
                         setReorderAvailable(prev => prev.filter((_, idx) => idx !== i));
                         setReorderSelected(prev => [...prev, word]);
                       }}
                       className="px-6 py-3 bg-white border-2 border-gray-200 border-b-4 rounded-xl font-bold text-xl text-gray-700 shadow-sm hover:-translate-y-1 transition-transform"
                     >
                       {word}
                     </motion.button>
                   ))}
                 </div>
               </>
            )}

            {currentItem?.type === 'matchword' && (
              <>
                 <h2 className="text-3xl font-black text-[#1E293B] mb-4">Nối các cặp tương ứng</h2>
                 <div className="grid grid-cols-2 gap-8">
                   {/* Left Side */}
                   <div className="flex flex-col gap-3">
                     {currentItem.data.map((pair, i) => {
                       const isMatched = matchMatched.includes(pair.id);
                       const isSelected = matchSelectedLeft === pair.id;
                       return (
                         <button
                           key={`l-${i}`}
                           disabled={isMatched || feedback !== null}
                           onClick={() => setMatchSelectedLeft(pair.id)}
                           className={`p-4 rounded-xl border-2 border-b-4 font-bold text-xl transition-all h-20 flex items-center justify-center
                             ${isMatched ? 'opacity-0 scale-95 pointer-events-none' : ''}
                             ${isSelected ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'}
                             ${!isMatched && !isSelected ? 'hover:bg-gray-50' : ''}
                           `}
                         >
                           {pair.left}
                         </button>
                       )
                     })}
                   </div>
                   {/* Right Side - we stabilize them */}
                   <div className="flex flex-col gap-3">
                     {matchRightItems.map((pair, i) => {
                       const isMatched = matchMatched.includes(pair.id);
                       return (
                         <button
                           key={`r-${i}`}
                           disabled={isMatched || feedback !== null || !matchSelectedLeft}
                           onClick={() => {
                              if (matchSelectedLeft === pair.id) {
                                setMatchMatched(prev => [...prev, pair.id]);
                                setMatchSelectedLeft(null);
                                soundManager.play('star_gain');
                              } else {
                                setMatchSelectedLeft(null);
                                soundManager.play('wrong');
                              }
                           }}
                           className={`p-4 rounded-xl border-2 border-b-4 font-bold text-xl transition-all h-20 flex items-center justify-center
                             ${isMatched ? 'opacity-0 scale-95 pointer-events-none' : ''}
                             border-gray-200 bg-white text-gray-700 hover:bg-gray-50
                           `}
                         >
                           {pair.right}
                         </button>
                       )
                     })}
                   </div>
                 </div>
              </>
            )}

          </motion.div>
        </AnimatePresence>
        </div>
      </div>

      {/* Footer / Feedback Banner */}
      <div 
        className={`w-full p-6 sm:p-8 flex items-center justify-between transition-colors border-t-2 relative ${
          feedback === 'success' ? 'bg-green-100 border-green-200' :
          feedback === 'error' ? 'bg-red-100 border-red-200' :
          'bg-white border-gray-100'
        }`}
      >
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
             setFeedback(null);
             setSelectedOption(null);
             setTypedAnswer('');
             setReorderSelected([]);
             if (currentItem?.type === 'reorder') setReorderAvailable([...currentItem.data.words].sort(() => 0.5 - Math.random()));
          } : handleContinue)}
          className={`px-10 py-4 rounded-2xl font-black text-xl uppercase tracking-widest transition-all ${
            feedback === 'success' ? 'bg-green-500 text-white hover:bg-green-600 border-b-4 border-green-700' :
            feedback === 'error' ? 'bg-red-500 text-white hover:bg-red-600 border-b-4 border-red-700' :
            isCheckDisabled() ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
            'bg-green-500 text-white border-b-4 border-green-700 hover:bg-green-400 hover:translate-y-px active:translate-y-1 active:border-b-0'
          }`}
        >
          {feedback === null ? 'KIỂM TRA' : (feedback === 'error' ? 'THỬ LẠI' : 'TIẾP TỤC')}
        </button>
      </div>
    </div>
  );
}
