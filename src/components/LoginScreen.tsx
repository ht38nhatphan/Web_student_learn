import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { getUsers } from '../lib/store';

interface Props {
  onLogin: (user: User) => void;
  onCancel: () => void;
}

export default function LoginScreen({ onLogin, onCancel }: Props) {
  const allUsers = getUsers();
  const students = allUsers.filter(u => u.role === 'student');
  const teachers = allUsers.filter(u => u.role === 'teacher');
  const [showTeacher, setShowTeacher] = useState(false);

  const displayUsers = showTeacher ? teachers : students;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#FFFBEB] w-full min-h-screen relative overflow-hidden">
      {/* Back button */}
      <button
        onClick={onCancel}
        className="absolute top-6 left-6 text-slate-700 bg-white px-5 py-2 rounded-full font-bold shadow-sm border-2 border-slate-200 hover:bg-slate-50 z-20 transition-colors"
      >
        ← Trở về
      </button>

      {/* Decorative blobs */}
      <div className="absolute top-10 left-10 w-40 h-40 bg-yellow-200 rounded-full blur-3xl opacity-40 pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-200 rounded-full blur-3xl opacity-40 pointer-events-none" />
      <div className="absolute top-1/2 right-20 w-48 h-48 bg-pink-200 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="text-center mb-10 relative z-10">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-slate-800 mb-3">
          Ai đang <span className="text-amber-500">ở đây?</span>
        </h1>
        <p className="text-lg text-slate-500 font-semibold">Chọn tên của bạn để bắt đầu nhé</p>
      </div>

      {/* Role toggle */}
      <div className="flex items-center gap-2 bg-white rounded-2xl p-1.5 border-2 border-slate-200 shadow-sm mb-8 relative z-10">
        <button
          onClick={() => setShowTeacher(false)}
          className={`px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-wide transition-all ${
            !showTeacher ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          👨‍🎓 Học sinh
        </button>
        <button
          onClick={() => setShowTeacher(true)}
          className={`px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-wide transition-all ${
            showTeacher ? 'bg-purple-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          👩‍🏫 Giáo viên
        </button>
      </div>

      {/* User grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={showTeacher ? 'teacher' : 'student'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl w-full relative z-10"
        >
          {displayUsers.map((user) => (
            <motion.button
              key={user.id}
              whileHover={{ scale: 1.04, translateY: -4 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onLogin(user)}
              className={`flex items-center gap-4 p-5 rounded-3xl border-4 bg-white shadow-sm hover:shadow-lg cursor-pointer transition-shadow ${user.color}`}
            >
              <div className="text-4xl">{user.avatar}</div>
              <div className="text-left">
                <div className="text-xl font-black text-slate-800">{user.name}</div>
                <div className="text-xs font-bold opacity-70 uppercase tracking-widest mt-0.5">
                  {user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
