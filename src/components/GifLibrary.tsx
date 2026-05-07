import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getGames, getChallenges } from '../lib/store';
import { GameDef, ChallengeDef } from '../types';
import { Upload, Trash2, Image, RefreshCw, X, Layers, LayoutTemplate, Sparkles } from 'lucide-react';
import { PRESET_THEMES, makePresetUrl } from './StageBackground';

interface GifItem {
  id: string; lesson_id: string | null; challenge_id: string | null;
  question_type: string | null; label: string | null;
  storage_path: string; url: string | null; sort_order: number; created_at: string;
}

const INNER_TYPES = [
  { value: '', label: '🌐 Dùng chung (tất cả loại)' },
  { value: 'multiplechoice', label: '🔵 Trắc nghiệm' },
  { value: 'fillblank', label: '✏️ Điền từ' },
  { value: 'matchword', label: '🔗 Nối từ' },
  { value: 'reorder', label: '🔤 Sắp xếp' },
  { value: 'truefalse', label: '✅ Đúng / Sai' },
  { value: 'typing', label: '⌨️ Gõ từ' },
];

const FRAME_TYPE = '__frame__';
const BUCKET = 'lesson-gifs';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
function getPublicUrl(path: string) { return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`; }
function getLabelForType(qt: string | null) {
  if (qt === FRAME_TYPE) return '🖼️ Khung ngoài';
  return INNER_TYPES.find(t => t.value === (qt ?? ''))?.label ?? '🌐 Dùng chung';
}
type GifScope = 'inner' | 'frame';

/** Xóa bản ghi cũ trùng key trước khi insert */
async function deleteConflicting(lessonId: string | null, challengeId: string | null, questionType: string | null) {
  let q = supabase.from('lesson_gifs').delete();
  q = lessonId ? q.eq('lesson_id', lessonId) : q.is('lesson_id', null) as any;
  q = challengeId ? q.eq('challenge_id', challengeId) : q.is('challenge_id', null) as any;
  q = questionType ? q.eq('question_type', questionType) : q.is('question_type', null) as any;
  await q;
}

export default function GifLibrary() {
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [lessons, setLessons] = useState<GameDef[]>([]);
  const [challenges, setChallenges] = useState<ChallengeDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uploadScope, setUploadScope] = useState<GifScope>('inner');
  const [frameMode, setFrameMode] = useState<'preset' | 'upload'>('preset');
  const [innerMode, setInnerMode] = useState<'type' | 'challenge'>('type');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [filterLesson, setFilterLesson] = useState('');
  const [filterScope, setFilterScope] = useState<GifScope | 'all'>('all');
  const [newLabel, setNewLabel] = useState('');
  const [newLessonId, setNewLessonId] = useState('');
  const [newInnerType, setNewInnerType] = useState('');
  const [newChallengeId, setNewChallengeId] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchGifs = async () => {
    setLoading(true);
    try {
      const q = supabase.from('lesson_gifs').select('*').order('sort_order');
      const { data, error: err } = await (
        filterLesson && filterScope === 'frame' ? q.eq('lesson_id', filterLesson).eq('question_type', FRAME_TYPE)
        : filterLesson && filterScope === 'inner' ? q.eq('lesson_id', filterLesson).neq('question_type', FRAME_TYPE)
        : filterLesson ? q.eq('lesson_id', filterLesson)
        : filterScope === 'frame' ? q.eq('question_type', FRAME_TYPE)
        : filterScope === 'inner' ? q.neq('question_type', FRAME_TYPE)
        : q
      );
      if (err) throw err;
      setGifs(data ?? []);
    } catch (e: unknown) { setError((e as Error)?.message ?? 'Không tải được');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    setLessons(getGames());
    fetchGifs();
  }, [filterLesson, filterScope]); // eslint-disable-line

  useEffect(() => {
    setChallenges(getChallenges(newLessonId || undefined));
    setNewChallengeId('');
  }, [newLessonId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setSelectedFile(f); setPreviewUrl(URL.createObjectURL(f));
    if (!newLabel) setNewLabel(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleUpload = async () => {
    if (!selectedFile) { setError('Chọn file trước'); return; }
    setUploading(true); setError(null);
    try {
      const ext = selectedFile.name.split('.').pop() ?? 'gif';
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, selectedFile, { upsert: false });
      if (upErr) throw upErr;
      const qt: string | null = uploadScope === 'frame' ? FRAME_TYPE : (innerMode === 'challenge' ? null : (newInnerType || null));
      const cid: string | null = uploadScope === 'inner' && innerMode === 'challenge' ? (newChallengeId || null) : null;
      await deleteConflicting(newLessonId || null, cid, qt);
      const { error: dbErr } = await supabase.from('lesson_gifs').insert({
        lesson_id: newLessonId || null, challenge_id: cid, question_type: qt,
        label: newLabel || selectedFile.name, storage_path: path, url: getPublicUrl(path), sort_order: gifs.length,
      });
      if (dbErr) throw dbErr;
      setSelectedFile(null); setPreviewUrl(null); setNewLabel(''); setNewLessonId(''); setNewInnerType(''); setNewChallengeId('');
      if (fileRef.current) fileRef.current.value = '';
      await fetchGifs();
    } catch (e: unknown) { setError((e as Error)?.message ?? 'Upload thất bại');
    } finally { setUploading(false); }
  };

  const handleSavePreset = async () => {
    if (!selectedPreset) { setError('Chọn mẫu nền'); return; }
    setUploading(true); setError(null);
    try {
      const presetUrl = makePresetUrl(selectedPreset);
      const info = PRESET_THEMES.find(t => t.id === selectedPreset);
      await deleteConflicting(newLessonId || null, null, FRAME_TYPE);
      const { error: dbErr } = await supabase.from('lesson_gifs').insert({
        lesson_id: newLessonId || null, challenge_id: null, question_type: FRAME_TYPE,
        label: `${info?.emoji} ${info?.name}`, storage_path: presetUrl, url: presetUrl, sort_order: gifs.length,
      });
      if (dbErr) throw dbErr;
      setSelectedPreset(null); setNewLessonId('');
      await fetchGifs();
    } catch (e: unknown) { setError((e as Error)?.message ?? 'Lưu thất bại');
    } finally { setUploading(false); }
  };

  const handleDelete = async (gif: GifItem) => {
    if (!confirm(`Xóa "${gif.label || gif.storage_path}"?`)) return;
    try {
      if (!gif.storage_path.startsWith('__preset__')) await supabase.storage.from(BUCKET).remove([gif.storage_path]);
      await supabase.from('lesson_gifs').delete().eq('id', gif.id);
      setGifs(prev => prev.filter(g => g.id !== gif.id));
    } catch (e: unknown) { setError((e as Error)?.message ?? 'Không xóa được'); }
  };

  const Btn = ({ children, onClick, disabled, color = 'purple' }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; color?: string }) => (
    <button onClick={onClick} disabled={disabled}
      className={`w-full py-3 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all ${disabled
        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
        : color === 'indigo' ? 'bg-indigo-500 hover:bg-indigo-600 border-b-4 border-indigo-700'
        : 'bg-purple-500 hover:bg-purple-600 border-b-4 border-purple-700'}`}>
      {children}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-3xl font-black text-[#1E293B]">🖼️ Thư viện <span className="text-purple-600">GIF &amp; Ảnh</span></h2>
        <button onClick={fetchGifs} className="p-2 rounded-xl border-2 border-slate-200 hover:bg-slate-50"><RefreshCw className="w-4 h-4 text-slate-500" /></button>
      </div>

      {error && <div className="flex items-center gap-3 bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3">
        <X className="w-5 h-5 text-red-500 shrink-0" />
        <p className="text-red-700 font-bold text-sm flex-1">{error}</p>
        <button onClick={() => setError(null)} className="text-red-400 font-black">✕</button>
      </div>}

      <div className="bg-white rounded-3xl border-2 border-purple-200 p-6 space-y-4">
        <h3 className="font-black text-lg text-purple-700 flex items-center gap-2"><Upload className="w-5 h-5" /> Thêm GIF / Ảnh mới</h3>

        {/* Tab chính */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
          {(['inner', 'frame'] as const).map(s => (
            <button key={s} onClick={() => setUploadScope(s)}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-black text-sm transition-all ${
                uploadScope === s ? (s === 'inner' ? 'bg-white shadow text-purple-700 border-2 border-purple-200' : 'bg-white shadow text-indigo-700 border-2 border-indigo-200') : 'text-slate-500'}`}>
              {s === 'inner' ? <><Layers className="w-4 h-4" />Nền câu hỏi</> : <><LayoutTemplate className="w-4 h-4" />Khung ngoài</>}
            </button>
          ))}
        </div>

        {/* ── FRAME SCOPE ── */}
        {uploadScope === 'frame' && (<>
          <p className="text-xs text-indigo-500 font-bold bg-indigo-50 rounded-xl px-3 py-2">🖼️ Khung bao quanh toàn màn hình khi học sinh làm bài</p>
          <div className="grid grid-cols-2 gap-2 p-1 bg-indigo-50 rounded-xl">
            {(['preset', 'upload'] as const).map(m => (
              <button key={m} onClick={() => setFrameMode(m)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-black text-xs transition-all ${
                  frameMode === m ? 'bg-white shadow text-indigo-700 border-2 border-indigo-200' : 'text-indigo-400'}`}>
                {m === 'preset' ? <><Sparkles className="w-3.5 h-3.5" />Mẫu có sẵn</> : <><Upload className="w-3.5 h-3.5" />Upload GIF</>}
              </button>
            ))}
          </div>

          {frameMode === 'preset' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-indigo-500">Chọn mẫu nền động:</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {PRESET_THEMES.map(t => (
                  <button key={t.id} onClick={() => setSelectedPreset(t.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${
                      selectedPreset === t.id ? 'border-indigo-500 bg-indigo-50 scale-105 shadow-md' : 'border-slate-200 hover:border-indigo-300'}`}>
                    <span className="text-2xl">{t.emoji}</span>
                    <span className="text-[10px] font-black text-center leading-tight">{t.name}</span>
                  </button>
                ))}
              </div>
              {selectedPreset && <p className="text-xs text-indigo-600 font-bold bg-indigo-50 rounded-xl px-3 py-2">
                ✅ {PRESET_THEMES.find(t => t.id === selectedPreset)?.emoji} <strong>{PRESET_THEMES.find(t => t.id === selectedPreset)?.name}</strong> — {PRESET_THEMES.find(t => t.id === selectedPreset)?.desc}
              </p>}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase block mb-1">Bài học <span className="text-slate-300">(để trống = dùng chung)</span></label>
                <select value={newLessonId} onChange={e => setNewLessonId(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold bg-white">
                  <option value="">🌐 Dùng chung tất cả bài</option>
                  {lessons.map(l => <option key={l.id} value={l.id}>{l.icon} {l.title}</option>)}
                </select>
              </div>
              <Btn onClick={handleSavePreset} disabled={!selectedPreset || uploading} color="indigo">
                {uploading ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />Đang lưu...</> : <><Sparkles className="w-4 h-4" />Lưu mẫu nền</>}
              </Btn>
            </div>
          )}
        </>)}

        {/* ── INNER SCOPE ── */}
        {uploadScope === 'inner' && (
          <p className="text-xs text-slate-400 font-bold bg-purple-50 rounded-xl px-3 py-2 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-purple-400" /> Nền phía sau câu hỏi (blur nhẹ)
          </p>
        )}

        {/* ── CUSTOM UPLOAD (frame+upload hoặc inner) ── */}
        {(uploadScope === 'inner' || (uploadScope === 'frame' && frameMode === 'upload')) && (
          <div className="space-y-3">
            {/* Bài học */}
            <div>
              <label className="text-xs font-black text-slate-500 uppercase block mb-1">Bài học <span className="text-slate-300">(để trống = dùng chung)</span></label>
              <select value={newLessonId} onChange={e => setNewLessonId(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold bg-white">
                <option value="">🌐 Dùng chung tất cả bài</option>
                {lessons.map(l => <option key={l.id} value={l.id}>{l.icon} {l.title}</option>)}
              </select>
            </div>

            {/* Inner: loại câu hỏi hoặc theo thử thách */}
            {uploadScope === 'inner' && newLessonId && (
              <>
                <div className="grid grid-cols-2 gap-2 p-1 bg-purple-50 rounded-xl">
                  {(['type', 'challenge'] as const).map(m => (
                    <button key={m} onClick={() => setInnerMode(m)}
                      className={`py-2 px-3 rounded-lg font-black text-xs transition-all ${
                        innerMode === m ? 'bg-white shadow text-purple-700 border-2 border-purple-200' : 'text-purple-400'}`}>
                      {m === 'type' ? '📚 Loại câu hỏi' : '🎯 Theo thử thách'}
                    </button>
                  ))}
                </div>
                {innerMode === 'type' && (
                  <select value={newInnerType} onChange={e => setNewInnerType(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold bg-white">
                    {INNER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                )}
                {innerMode === 'challenge' && (
                  <select value={newChallengeId} onChange={e => setNewChallengeId(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold bg-white">
                    <option value="">-- Chọn thử thách --</option>
                    {challenges.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                )}
              </>
            )}

            {/* Tên nhãn */}
            <div>
              <label className="text-xs font-black text-slate-500 uppercase block mb-1">Tên nhãn</label>
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="VD: GIF bài học"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" />
            </div>

            {/* File picker */}
            <div onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                uploadScope === 'frame' ? 'border-indigo-300 hover:border-indigo-500' : 'border-purple-300 hover:border-purple-500'}`}>
              {previewUrl ? <img src={previewUrl} alt="preview" className="max-h-40 rounded-xl object-contain" /> : (<>
                <Image className={`w-10 h-10 ${uploadScope === 'frame' ? 'text-indigo-300' : 'text-purple-300'}`} />
                <p className="text-slate-400 font-bold text-sm">Click để chọn ảnh hoặc GIF</p>
                <p className="text-slate-300 text-xs">PNG, JPG, GIF, WebP — tối đa 5MB</p>
              </>)}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            <Btn onClick={handleUpload} disabled={!selectedFile || uploading} color={uploadScope === 'frame' ? 'indigo' : 'purple'}>
              {uploading ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />Đang upload...</> : <><Upload className="w-4 h-4" />Upload</>}
            </Btn>
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-black text-slate-500">Lọc:</label>
        <select value={filterLesson} onChange={e => setFilterLesson(e.target.value)}
          className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold bg-white">
          <option value="">Tất cả bài học</option>
          {lessons.map(l => <option key={l.id} value={l.id}>{l.icon} {l.title}</option>)}
        </select>
        <div className="flex rounded-xl border-2 border-slate-200 overflow-hidden">
          {(['all', 'inner', 'frame'] as const).map(val => (
            <button key={val} onClick={() => setFilterScope(val)}
              className={`px-3 py-1.5 text-xs font-black transition-colors ${filterScope === val ? 'bg-purple-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {val === 'all' ? 'Tất cả' : val === 'inner' ? 'Nền câu hỏi' : 'Khung ngoài'}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 font-bold">{gifs.length} ảnh</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-purple-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : gifs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Image className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="font-black text-lg">Chưa có GIF nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {gifs.map(gif => {
            const lesson = lessons.find(l => l.id === gif.lesson_id);
            const challenge = challenges.find(c => c.id === gif.challenge_id);
            const imgUrl = gif.url || getPublicUrl(gif.storage_path);
            const isFrame = gif.question_type === FRAME_TYPE;
            const isPreset = gif.storage_path.startsWith('__preset__');
            const presetInfo = isPreset ? PRESET_THEMES.find(t => t.id === gif.storage_path.replace('__preset__:', '')) : null;
            return (
              <div key={gif.id} className={`group relative bg-white rounded-2xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-all ${
                isFrame ? 'border-indigo-200 hover:border-indigo-400' : 'border-slate-100 hover:border-purple-200'}`}>
                <div className={`absolute top-0 left-0 right-0 z-10 text-center text-[9px] font-black py-0.5 ${isFrame ? 'bg-indigo-500 text-white' : 'bg-purple-500 text-white'}`}>
                  {isFrame ? '🖼️ KHUNG NGOÀI' : '🎨 NỀN CÂU HỎI'}
                </div>
                <div className="aspect-square bg-slate-50 overflow-hidden pt-4">
                  {isPreset && presetInfo ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                      <span className="text-4xl">{presetInfo.emoji}</span>
                      <span className="text-[10px] font-black text-indigo-600 mt-1 text-center px-1">{presetInfo.name}</span>
                    </div>
                  ) : (
                    <img src={imgUrl} alt={gif.label ?? ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="55%" x="50%" dominant-baseline="middle" text-anchor="middle" font-size="40">🖼️</text></svg>'; }} />
                  )}
                </div>
                <div className="p-2 space-y-0.5">
                  <p className="font-bold text-xs text-slate-700 truncate">{gif.label || gif.storage_path}</p>
                  {lesson && <p className="text-[10px] text-purple-600 font-bold truncate">{lesson.icon} {lesson.title}</p>}
                  {challenge && <p className="text-[10px] text-blue-500 font-bold truncate">🎯 {challenge.title}</p>}
                  <p className="text-[10px] text-slate-400 truncate">{getLabelForType(gif.question_type)}</p>
                </div>
                <button onClick={() => handleDelete(gif)}
                  className="absolute top-6 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {!isPreset && (
                  <button onClick={() => navigator.clipboard.writeText(imgUrl)}
                    className="absolute top-6 left-2 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg text-[10px] font-black">🔗</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
