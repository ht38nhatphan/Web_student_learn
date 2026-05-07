import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getUsers } from '../lib/store';

interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string;
  stars: number;
}

interface Props {
  currentUserId?: string;
}

export default function Leaderboard({ currentUserId }: Props) {
  const [top5, setTop5] = useState<LeaderboardUser[]>([]);
  const [myRank, setMyRank] = useState<{ rank: number; stars: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const { data: top, error } = await supabase
        .from('users')
        .select('id, name, avatar, stars')
        .eq('role', 'student')
        .order('stars', { ascending: false })
        .limit(5);

      if (error || !top) throw error;

      setTop5(top);

      // Tính hạng cho user ngoài top 5
      if (currentUserId && !top.find(u => u.id === currentUserId)) {
        const { data: allData } = await supabase
          .from('users')
          .select('id, stars')
          .eq('role', 'student')
          .order('stars', { ascending: false });

        if (allData) {
          const idx = allData.findIndex(u => u.id === currentUserId);
          const me = allData[idx];
          if (idx >= 0 && me) setMyRank({ rank: idx + 1, stars: me.stars ?? 0 });
          else setMyRank(null);
        }
      } else {
        setMyRank(null);
      }
    } catch {
      // Fallback: local cache
      const users = getUsers()
        .filter(u => u.role === 'student')
        .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
        .slice(0, 5);
      setTop5(users);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    // Polling mỗi 30 giây — không dùng Realtime để tránh lỗi StrictMode
    const timer = setInterval(fetchLeaderboard, 30_000);
    return () => clearInterval(timer);
  }, [currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const RANK_STYLES = [
    { icon: '👑', bg: 'bg-amber-50',  iconBg: 'bg-amber-100 text-amber-600' },
    { icon: '🥈', bg: 'bg-slate-50',  iconBg: 'bg-slate-100 text-slate-500' },
    { icon: '🥉', bg: 'bg-orange-50', iconBg: 'bg-orange-100 text-orange-500' },
    { icon: '4',  bg: '',             iconBg: 'bg-slate-100 text-slate-400' },
    { icon: '5',  bg: '',             iconBg: 'bg-slate-100 text-slate-400' },
  ];

  return (
    <div className="rounded-3xl border-2 border-amber-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-3.5 flex items-center gap-3">
        <span className="text-xl">🏆</span>
        <h3 className="text-base font-black text-white uppercase tracking-wide">Bảng Vàng</h3>
        <span className="ml-auto text-xs text-amber-100 font-bold">Top 5</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="px-5 py-6 text-center">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {/* Danh sách */}
      {!loading && (
        <div className="divide-y divide-slate-50">
          {top5.length === 0 && (
            <div className="px-5 py-6 text-center text-slate-400 font-bold text-sm">
              Chưa có dữ liệu
            </div>
          )}
          {top5.map((user, index) => {
            const style = RANK_STYLES[index];
            const isMe = user.id === currentUserId;
            const isTop1 = index === 0;

            return (
              <div
                key={user.id}
                className={`flex items-center gap-3 px-4 transition-colors
                  ${style.bg}
                  ${isMe ? 'ring-2 ring-inset ring-blue-300' : ''}
                  ${isTop1 ? 'py-3.5' : 'py-2.5'}
                `}
              >
                {/* Hạng */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${style.iconBg}`}>
                  {index < 3
                    ? <span>{style.icon}</span>
                    : <span className="text-xs">#{style.icon}</span>}
                </div>

                {/* Avatar */}
                <div className={`rounded-full bg-white border-2 border-slate-100 flex items-center justify-center shadow-sm shrink-0 ${isTop1 ? 'w-10 h-10 text-2xl' : 'w-8 h-8 text-xl'}`}>
                  {user.avatar}
                </div>

                {/* Tên */}
                <div className="flex-1 min-w-0">
                  <span className={`font-bold text-slate-700 truncate block ${isTop1 ? 'text-sm' : 'text-xs'}`}>
                    {user.name}
                    {isMe && <span className="ml-1 text-blue-500 font-black text-[10px]"> (bạn)</span>}
                  </span>
                </div>

                {/* Điểm */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <span className={`font-black ${isTop1 ? 'text-amber-500 text-base' : 'text-slate-500 text-sm'}`}>
                    {(user.stars ?? 0).toLocaleString()}
                  </span>
                  <span className="text-amber-400">⭐</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hạng của tôi (nếu ngoài top 5) */}
      {!loading && myRank && (
        <div className="px-4 py-2 border-t-2 border-dashed border-slate-100 bg-blue-50">
          <p className="text-xs font-bold text-blue-600 text-center">
            Hạng của bạn: #{myRank.rank} • {myRank.stars.toLocaleString()} ⭐
          </p>
        </div>
      )}
    </div>
  );
}
