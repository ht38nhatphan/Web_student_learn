import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, GameDef } from '../types';
import { getStoreData } from '../lib/store';
import { AppData } from '../data/content';
import { ChevronDown, ChevronUp, Search, Filter, Trophy, TrendingUp, TrendingDown, Users, CheckCircle, XCircle, BarChart3, Star, BookOpen } from 'lucide-react';

interface Props {
  students: User[];
  games: GameDef[];
  appContent: AppData;
}


type FilterMode = 'all' | 'top' | 'needs_help';
type SortKey = 'name' | 'stars' | 'correct' | 'accuracy';

function getStudentStats(student: User, appContent: AppData) {
  const challenges = appContent.challenges ?? [];
  let totalQ = 0, doneQ = 0, wrongCount = 0;
  const wrongMap = getStoreData<Record<string, number>>(`hvtv_wrong_${student.id}`, {});

  // Count total wrong from wrong map
  wrongCount = Object.values(wrongMap).reduce((a, b) => a + b, 0);

  // Progress per challenge
  const challengeStats: { id: string; title: string; lessonTitle: string; totalQ: number; doneQ: number; pct: number }[] = [];

  for (const c of challenges) {
    const maxQ = (['multiplechoice','fillblank','matchword','reorder','truefalse','typing'] as const)
      .reduce((sum, t) => sum + ((appContent[t]?.[c.id]?.length) || 0), 0);
    const prog = getStoreData<{ completedIds: string[] }>(`hvtv_prog_${student.id}_${c.id}`, { completedIds: [] });
    totalQ += maxQ;
    doneQ += prog.completedIds.length;
    if (maxQ > 0) {
      challengeStats.push({
        id: c.id,
        title: c.title,
        lessonTitle: '',
        totalQ: maxQ,
        doneQ: prog.completedIds.length,
        pct: Math.round((prog.completedIds.length / maxQ) * 100),
      });
    }
  }

  const stars = getStoreData<number>(`hvtv_stars_${student.id}`, student.stars ?? 0);
  const correct = doneQ;
  const accuracy = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;

  return { totalQ, doneQ, wrongCount, stars, correct, accuracy, challengeStats, wrongMap };
}

export default function ClassOverview({ students, games, appContent }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortKey>('stars');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const statsMap = useMemo(() => {
    const m = new Map<string, ReturnType<typeof getStudentStats>>();
    for (const s of students) m.set(s.id, getStudentStats(s, appContent));
    return m;
  }, [students, appContent]);

  // Tổng lớp
  const classTotal = useMemo(() => {
    let totalStars = 0, totalCorrect = 0, totalWrong = 0, totalQ = 0;
    for (const s of students) {
      const st = statsMap.get(s.id)!;
      totalStars += st.stars; totalCorrect += st.correct;
      totalWrong += st.wrongCount; totalQ += st.totalQ;
    }
    const avgAccuracy = students.length > 0
      ? Math.round(students.reduce((a, s) => a + (statsMap.get(s.id)?.accuracy ?? 0), 0) / students.length)
      : 0;
    return { totalStars, totalCorrect, totalWrong, totalQ, avgAccuracy };
  }, [students, statsMap]);

  // Lọc + sắp xếp
  const filtered = useMemo(() => {
    let list = students.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase())
    );
    if (filter === 'top') list = list.filter(s => (statsMap.get(s.id)?.accuracy ?? 0) >= 70);
    if (filter === 'needs_help') list = list.filter(s => (statsMap.get(s.id)?.accuracy ?? 0) < 50);

    list = [...list].sort((a, b) => {
      const sa = statsMap.get(a.id)!, sb = statsMap.get(b.id)!;
      let diff = 0;
      if (sort === 'name') diff = a.name.localeCompare(b.name, 'vi');
      else if (sort === 'stars') diff = sa.stars - sb.stars;
      else if (sort === 'correct') diff = sa.correct - sb.correct;
      else if (sort === 'accuracy') diff = sa.accuracy - sb.accuracy;
      return sortAsc ? diff : -diff;
    });
    return list;
  }, [students, search, filter, sort, sortAsc, statsMap]);

  const handleSort = (key: SortKey) => {
    if (sort === key) setSortAsc(v => !v);
    else { setSort(key); setSortAsc(false); }
  };

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => handleSort(k)}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${sort === k ? 'bg-purple-600 text-white' : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-purple-300'}`}>
      {label}
      {sort === k ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
    </button>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-slate-800">📊 Tổng quan lớp học</h2>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Học sinh', value: students.length, unit: 'em', icon: <Users className="w-5 h-5"/>, color: 'blue' },
          { label: 'Tổng sao lớp', value: classTotal.totalStars.toLocaleString(), unit: '⭐', icon: <Star className="w-5 h-5"/>, color: 'amber' },
          { label: 'Tỉ lệ đúng TB', value: `${classTotal.avgAccuracy}%`, unit: '', icon: <TrendingUp className="w-5 h-5"/>, color: 'green' },
          { label: 'Cần hỗ trợ', value: students.filter(s => (statsMap.get(s.id)?.accuracy ?? 0) < 50).length, unit: 'em', icon: <TrendingDown className="w-5 h-5"/>, color: 'rose' },
        ].map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`bg-white rounded-2xl border-2 p-4 shadow-sm border-${c.color}-200`}>
            <div className={`text-${c.color}-500 flex items-center gap-2 mb-2`}>{c.icon}<span className="text-xs font-black uppercase">{c.label}</span></div>
            <div className="text-3xl font-black text-slate-800">{c.value}<span className="text-base text-slate-400 ml-1">{c.unit}</span></div>
          </motion.div>
        ))}
      </div>

      {/* ── Biểu đồ thanh đơn giản: top 5 học sinh ── */}
      {students.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-purple-500"/>
            <h3 className="font-black text-slate-700">Bảng xếp hạng độ chính xác</h3>
          </div>
          <div className="space-y-2">
            {[...students]
              .sort((a, b) => (statsMap.get(b.id)?.accuracy ?? 0) - (statsMap.get(a.id)?.accuracy ?? 0))
              .slice(0, 8)
              .map((s, i) => {
                const st = statsMap.get(s.id)!;
                const pct = st.accuracy;
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className={`text-sm font-black w-5 text-right ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-400'}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}
                    </span>
                    <span className="w-32 text-sm font-bold text-slate-700 truncate">{s.name}</span>
                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.06, duration: 0.7 }}
                        className={`h-full rounded-full flex items-center justify-end pr-2 ${pct >= 80 ? 'bg-green-400' : pct >= 50 ? 'bg-orange-400' : 'bg-red-400'}`}>
                      </motion.div>
                    </div>
                    <span className={`text-sm font-black w-12 text-right ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-orange-500' : 'text-red-500'}`}>{pct}%</span>
                    <span className="text-xs text-amber-500 font-bold w-14 text-right">{st.stars}⭐</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Bộ lọc + tìm kiếm ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-slate-400 shrink-0"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm học sinh..." className="text-sm font-bold outline-none flex-1 bg-transparent"/>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Filter className="w-4 h-4 text-slate-400"/>
          {([['all','Tất cả'], ['top','Xuất sắc ≥70%'], ['needs_help','Cần hỗ trợ <50%']] as [FilterMode,string][]).map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${filter === v ? 'bg-purple-600 text-white' : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-purple-300'}`}>{l}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-bold text-slate-400">Sắp xếp:</span>
          <SortBtn k="name" label="Tên" />
          <SortBtn k="accuracy" label="Độ chính xác" />
          <SortBtn k="correct" label="Câu đúng" />
          <SortBtn k="stars" label="Sao" />
        </div>
      </div>

      {/* ── Danh sách học sinh ── */}
      <div className="text-xs text-slate-400 font-bold px-1">{filtered.length} học sinh</div>
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map((student, idx) => {
            const st = statsMap.get(student.id)!;
            const isExpanded = expandedId === student.id;
            const accuracyColor = st.accuracy >= 80 ? 'text-green-600' : st.accuracy >= 50 ? 'text-orange-500' : 'text-red-500';
            const borderColor = st.accuracy >= 80 ? 'border-green-200' : st.accuracy >= 50 ? 'border-orange-200' : 'border-red-200';

            return (
              <motion.div key={student.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`bg-white rounded-2xl border-2 ${borderColor} overflow-hidden shadow-sm`}>

                {/* Row chính */}
                <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : student.id)}>
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black bg-purple-100 text-purple-700 shrink-0"
                    style={student.color ? { background: student.color.split(' ')[0] } : {}}>
                    {student.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Tên + rank */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-800 text-base">{student.name}</span>
                      {st.accuracy >= 90 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black">🏆 Xuất sắc</span>}
                      {st.accuracy < 40 && st.totalQ > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black">⚠️ Cần giúp</span>}
                    </div>
                    {/* Mini bar */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                        <div className={`h-full rounded-full ${st.accuracy >= 80 ? 'bg-green-400' : st.accuracy >= 50 ? 'bg-orange-400' : 'bg-red-400'}`}
                          style={{ width: `${st.accuracy}%` }} />
                      </div>
                      <span className={`text-xs font-black ${accuracyColor}`}>{st.accuracy}%</span>
                    </div>
                  </div>

                  {/* Stats nhanh */}
                  <div className="hidden sm:flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4"/><span className="font-black text-sm">{st.correct}</span></div>
                      <div className="text-xs text-slate-400">Đúng</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-red-400"><XCircle className="w-4 h-4"/><span className="font-black text-sm">{st.wrongCount}</span></div>
                      <div className="text-xs text-slate-400">Sai</div>
                    </div>
                    <div className="text-center">
                      <div className="font-black text-sm text-amber-500">{st.stars}⭐</div>
                      <div className="text-xs text-slate-400">Sao</div>
                    </div>
                  </div>
                  <div className="text-slate-300">{isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}</div>
                </div>

                {/* Chi tiết mở rộng */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t-2 border-slate-100">
                      <div className="p-4 space-y-5 bg-slate-50">

                        {/* Stats tóm tắt */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: 'Câu đúng', val: st.correct, icon: '✅', cls: 'bg-green-50 border-green-200 text-green-700' },
                            { label: 'Câu sai', val: st.wrongCount, icon: '❌', cls: 'bg-red-50 border-red-200 text-red-600' },
                            { label: 'Tổng câu', val: st.totalQ, icon: '📝', cls: 'bg-blue-50 border-blue-200 text-blue-700' },
                            { label: 'Sao tích lũy', val: `${st.stars}⭐`, icon: '🌟', cls: 'bg-amber-50 border-amber-200 text-amber-700' },
                          ].map((item, i) => (
                            <div key={i} className={`rounded-xl border-2 p-3 ${item.cls}`}>
                              <div className="text-lg font-black">{item.icon} {item.val}</div>
                              <div className="text-xs font-bold mt-0.5 opacity-70">{item.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Tiến độ từng thử thách */}
                        {st.challengeStats.length > 0 && (
                          <div>
                            <h4 className="font-black text-slate-600 text-sm uppercase mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4"/>Tiến độ thử thách</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {st.challengeStats.map(cs => (
                                <div key={cs.id} className="bg-white rounded-xl border-2 border-slate-100 px-3 py-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-slate-700 truncate flex-1">{cs.title}</span>
                                    <span className="text-xs font-black text-slate-500 shrink-0 ml-2">{cs.doneQ}/{cs.totalQ}</span>
                                  </div>
                                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${cs.pct === 100 ? 'bg-green-400' : cs.pct > 0 ? 'bg-blue-400' : 'bg-slate-200'}`}
                                      style={{ width: `${cs.pct}%` }} />
                                  </div>
                                  {cs.pct === 100 && <div className="text-xs text-green-600 font-black mt-0.5">✅ Hoàn thành</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Câu hỏi sai nhiều nhất */}
                        {Object.keys(st.wrongMap).length > 0 && (
                          <div>
                            <h4 className="font-black text-slate-600 text-sm uppercase mb-3 flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400"/>Câu trả lời sai nhiều lần</h4>
                            <div className="space-y-1.5">
                              {Object.entries(st.wrongMap)
                                .sort(([,a],[,b]) => b - a)
                                .slice(0, 5)
                                .map(([qid, count]) => (
                                  <div key={qid} className="flex items-center gap-3 bg-white rounded-xl border border-red-100 px-3 py-2">
                                    <span className="text-xs font-mono text-slate-400 flex-1 truncate">ID: {qid.slice(-8)}</span>
                                    <div className="flex items-center gap-1">
                                      {Array.from({length: Math.min(count, 5)}).map((_, i) => (
                                        <div key={i} className="w-2 h-2 rounded-full bg-red-400"/>
                                      ))}
                                      {count > 5 && <span className="text-xs font-black text-red-500">+{count-5}</span>}
                                    </div>
                                    <span className="text-xs font-black text-red-500">{count}x sai</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 font-bold">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30"/>
            <p>Không tìm thấy học sinh phù hợp</p>
          </div>
        )}
      </div>
    </div>
  );
}
