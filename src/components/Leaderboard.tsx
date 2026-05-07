import { useState, useEffect } from 'react';
import { User } from '../types';
import { getStoreData, getUsers } from '../lib/store';

export default function Leaderboard() {
  const [sortedUsers, setSortedUsers] = useState<User[]>([]);

  useEffect(() => {
    const users = getUsers()
      .filter(u => u.role === 'student')
      .map(u => ({
        ...u,
        stars: getStoreData<number>(`hvtv_stars_${u.id}`, u.stars)
      }))
      .sort((a, b) => b.stars - a.stars);
    setSortedUsers(users);
  }, []);

  const medals = ['🥇', '🥈', '🥉'];
  const rowColors = [
    'bg-amber-50 border-amber-200',
    'bg-slate-50 border-slate-200',
    'bg-orange-50 border-orange-200',
  ];

  return (
    <div className="rounded-3xl border-3 border-amber-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-4 flex items-center gap-3">
        <span className="text-2xl">🏆</span>
        <h3 className="text-lg font-black text-white uppercase tracking-wide">Bảng Vàng</h3>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {sortedUsers.length === 0 && (
          <div className="px-5 py-6 text-center text-slate-400 font-bold text-sm">
            Chưa có dữ liệu
          </div>
        )}
        {sortedUsers.map((user, index) => (
          <div
            key={user.id}
            className={`flex items-center gap-3 px-4 py-3 ${index < 3 ? rowColors[index] + ' border-l-4' : ''} transition-colors hover:bg-blue-50/40`}
          >
            {/* Rank */}
            <div className="w-8 flex justify-center shrink-0">
              {index < 3
                ? <span className="text-xl">{medals[index]}</span>
                : <span className="text-sm font-black text-slate-400">#{index + 1}</span>
              }
            </div>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-xl shadow-sm shrink-0">
              {user.avatar}
            </div>

            {/* Name */}
            <span className="font-bold text-slate-700 flex-1 truncate text-sm">{user.name}</span>

            {/* Stars */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-black text-amber-500 text-sm">{user.stars.toLocaleString()}</span>
              <span className="text-sm">⭐</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
