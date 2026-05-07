import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, XCircle } from 'lucide-react';
import { AppData, FillBlankQuestion, MatchPair, MultipleChoiceQuestion, ReorderQuestion, TrueFalseQuestion, TypingQuestion } from '../data/content';
import { ChallengeDef } from '../types';
import { getAppContent, getStoreData, setStoreData } from '../lib/store';

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

export default function LessonEngine({ challenge, userId, onComplete, onPenalty, onBack }: Props) {
  const [items, setItems] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Game state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [matchPairs, setMatchPairs] = useState<{left: string, right: string}[]>([]); 
  const [matchSelectedLeft, setMatchSelectedLeft] = useState<string | null>(null);
  const [matchMatched, setMatchMatched] = useState<string[]>([]);
  
  const [reorderSelected, setReorderSelected] = useState<string[]>([]);
  const [reorderAvailable, setReorderAvailable] = useState<string[]>([]);
  const [matchRightItems, setMatchRightItems] = useState<{id: string, left: string, right: string}[]>([]);

  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);
  
  const [correctCount, setCorrectCount] = useState(0);

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
      setCorrectCount(c => c + 1);
      new Audio('/sounds/correct.mp3').play().catch(() => {});
      
      // Save progress so they don't see it again
      const progress = getStoreData<{ completedIds: string[] }>(`hvtv_prog_${userId}_${challenge.id}`, { completedIds: [] });
      let qid = '';
      if (currentItem.type === 'matchword') qid = currentItem.data[0].id;
      else qid = currentItem.data.id;
      
      progress.completedIds.push(qid);
      setStoreData(`hvtv_prog_${userId}_${challenge.id}`, progress);

    } else {
      setFeedback('error');
      new Audio('/sounds/wrong.mp3').play().catch(() => {});
      
      if (userId) {
        const wrongKey = `hvtv_wrong_${userId}`;
        const prevData = getStoreData<Record<string, number>>(wrongKey, {});
        let qid = '';
        if (currentItem.type === 'matchword') qid = currentItem.data[0]?.id || 'unknown';
        else if (currentItem.type !== 'matchword') qid = currentItem.data.id;
        
        if (qid) {
           prevData[qid] = (prevData[qid] || 0) + 1;
           setStoreData(wrongKey, prevData);
        }
      }

      onPenalty(); // Deduct point right away
    }
  };

  const handleContinue = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete(correctCount * 10); // 10 stars per unique correct question
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

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-8 rounded-3xl mt-8">
        <h2 className="text-2xl font-bold text-gray-400 mb-4">Thử thách này chưa có câu hỏi nào.</h2>
        <button onClick={onBack} className="px-6 py-3 bg-gray-200 font-bold rounded-2xl hover:bg-gray-300">Trở lại</button>
      </div>
    );
  }

  const progress = (currentIndex / items.length) * 100;

  return (
    <div className="flex-1 flex flex-col bg-white rounded-3xl overflow-hidden shadow-xl mt-8 relative max-w-4xl mx-auto w-full">
      {/* Header Progress */}
      <div className="p-6 flex items-center gap-4 border-b-2 border-gray-100">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600"><X className="w-8 h-8" /></button>
        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-green-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', bounce: 0 }}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-8 flex flex-col justify-center overflow-y-auto">
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
                <div className="text-xl font-medium text-gray-700 bg-gray-50 p-6 rounded-2xl border-2 border-gray-100 border-b-4 mb-4">
                  {currentItem.data.question}
                </div>
                <div className="flex flex-col gap-3">
                  {currentItem.data.options.map((opt, i) => (
                    <button
                      key={i}
                      disabled={feedback !== null}
                      onClick={() => setSelectedOption(opt)}
                      className={`p-4 rounded-2xl border-2 border-b-4 font-bold text-lg text-left transition-all ${
                        selectedOption === opt 
                          ? 'border-blue-400 bg-blue-50 text-blue-700' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
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
                               // Match!
                               setMatchMatched(prev => [...prev, pair.id]);
                               setMatchSelectedLeft(null);
                               new Audio('/sounds/bell.mp3').play().catch(()=>{});
                             } else {
                               // Wrong pair
                               setMatchSelectedLeft(null);
                               new Audio('/sounds/wrong.mp3').play().catch(()=>{});
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
               <span className="font-black text-2xl hidden sm:inline">Chính xác!</span>
            </motion.div>
          )}
          {feedback === 'error' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col text-red-700">
               <div className="flex items-center gap-3 mb-1">
                 <div className="bg-red-500 rounded-full p-2 text-white shadow-lg shadow-red-500/30">
                   <XCircle className="w-8 h-8" />
                 </div>
                 <span className="font-black text-2xl hidden sm:inline">Chưa đúng!</span>
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
