import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getGames } from '../lib/store';
import { GameDef } from '../types';
import { Upload, Trash2, Image, RefreshCw, X } from 'lucide-react';

interface GifItem {
  id: string;
  lesson_id: string | null;
  challenge_id: string | null;
  question_type: string | null;
  label: string | null;
  storage_path: string;
  url: string | null;
  sort_order: number;
  created_at: string;
}

const QUESTION_TYPES = [
  { value: '',               label: '🌐 Dùng chung (tất cả loại)' },
  { value: 'multiplechoice', label: '🔵 Trắc nghiệm' },
  { value: 'fillblank',      label: '✏️ Điền từ' },
  { value: 'matchword',      label: '🔗 Nối từ' },
  { value: 'reorder',        label: '🔤 Sắp xếp' },
  { value: 'truefalse',      label: '✅ Đúng / Sai' },
  { value: 'typing',         label: '⌨️ Gõ từ' },
];

const BUCKET = 'lesson-gifs';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

function getPublicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export default function GifLibrary() {
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [lessons, setLessons] = useState<GameDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [filterLesson, setFilterLesson] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newLessonId, setNewLessonId] = useState('');
  const [newType, setNewType] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // Load danh sách GIF
  const fetchGifs = async () => {
    setLoading(true);
    try {
      const query = supabase.from('lesson_gifs').select('*').order('sort_order');
      const { data, error: err } = filterLesson
        ? await query.eq('lesson_id', filterLesson)
        : await query;
      if (err) throw err;
      setGifs(data ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Không tải được danh sách GIF');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLessons(getGames());
    fetchGifs();
  }, [filterLesson]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    // Tự điền label từ tên file
    if (!newLabel) setNewLabel(file.name.replace(/\.[^.]+$/, ''));
  };

  const handleUpload = async () => {
    if (!selectedFile) { setError('Vui lòng chọn file ảnh/GIF'); return; }
    setUploading(true);
    setError(null);
    try {
      // 1. Upload lên Storage
      const ext = selectedFile.name.split('.').pop();
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, selectedFile, { upsert: false });
      if (upErr) throw upErr;

      const publicUrl = getPublicUrl(path);

      // 2. Lưu metadata vào bảng lesson_gifs
      const { error: dbErr } = await supabase.from('lesson_gifs').insert({
        lesson_id: newLessonId || null,
        challenge_id: null,
        question_type: newType || null,
        label: newLabel || selectedFile.name,
        storage_path: path,
        url: publicUrl,
        sort_order: gifs.length,
      });
      if (dbErr) throw dbErr;

      // 3. Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setNewLabel('');
      setNewLessonId('');
      setNewType('');
      if (fileRef.current) fileRef.current.value = '';
      await fetchGifs();
    } catch (e: any) {
      setError(e?.message ?? 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (gif: GifItem) => {
    if (!confirm(`Xóa GIF "${gif.label || gif.storage_path}"?`)) return;
    try {
      // Xóa khỏi storage
      await supabase.storage.from(BUCKET).remove([gif.storage_path]);
      // Xóa khỏi bảng
      await supabase.from('lesson_gifs').delete().eq('id', gif.id);
      setGifs(prev => prev.filter(g => g.id !== gif.id));
    } catch (e: any) {
      setError(e?.message ?? 'Không xóa được GIF');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-3xl font-black text-[#1E293B]">
          🖼️ Thư viện <span className="text-purple-600">GIF & Ảnh</span>
        </h2>
        <button onClick={fetchGifs} className="p-2 rounded-xl border-2 border-slate-200 hover:bg-slate-50 transition-all" title="Tải lại">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3">
          <X className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-red-700 font-bold text-sm flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ─── Upload form ─── */}
      <div className="bg-white rounded-3xl border-2 border-purple-200 p-6 space-y-4">
        <h3 className="font-black text-lg text-purple-700 flex items-center gap-2">
          <Upload className="w-5 h-5" /> Thêm GIF / Ảnh mới
        </h3>

        {/* File picker + preview */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-purple-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all"
        >
          {previewUrl ? (
            <img src={previewUrl} alt="preview" className="max-h-40 rounded-xl object-contain" />
          ) : (
            <>
              <Image className="w-10 h-10 text-purple-300" />
              <p className="text-slate-400 font-bold text-sm">Click để chọn ảnh hoặc GIF</p>
              <p className="text-slate-300 text-xs">PNG, JPG, GIF, WebP — tối đa 5MB</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">Tên nhãn</label>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="VD: GIF bài học c/k"
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-purple-400 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">Bài học</label>
            <select
              value={newLessonId}
              onChange={e => setNewLessonId(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-purple-400 outline-none bg-white"
            >
              <option value="">🌐 Dùng chung</option>
              {lessons.map(l => (
                <option key={l.id} value={l.id}>{l.icon} {l.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">Loại câu hỏi</label>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-purple-400 outline-none bg-white"
            >
              {QUESTION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className={`w-full py-3 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2 ${
            !selectedFile || uploading
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-purple-500 hover:bg-purple-600 border-b-4 border-purple-700 active:translate-y-px active:border-b-0'
          }`}
        >
          {uploading ? (
            <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />Đang upload...</>
          ) : (
            <><Upload className="w-4 h-4" />Upload lên Supabase Storage</>
          )}
        </button>
      </div>

      {/* ─── Filter ─── */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-black text-slate-500 whitespace-nowrap">Lọc theo bài:</label>
        <select
          value={filterLesson}
          onChange={e => setFilterLesson(e.target.value)}
          className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold bg-white focus:border-purple-400 outline-none"
        >
          <option value="">Tất cả bài học</option>
          {lessons.map(l => (
            <option key={l.id} value={l.id}>{l.icon} {l.title}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400 font-bold">{gifs.length} ảnh</span>
      </div>

      {/* ─── Grid GIF ─── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : gifs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Image className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="font-black text-lg">Chưa có GIF nào</p>
          <p className="text-sm mt-1">Upload ảnh/GIF phía trên để bắt đầu</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {gifs.map(gif => {
            const lesson = lessons.find(l => l.id === gif.lesson_id);
            const typeLabel = QUESTION_TYPES.find(t => t.value === gif.question_type)?.label ?? '🌐 Dùng chung';
            const imgUrl = gif.url || getPublicUrl(gif.storage_path);

            return (
              <div key={gif.id} className="group relative bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm hover:shadow-md hover:border-purple-200 transition-all">
                {/* Image */}
                <div className="aspect-square bg-slate-50 overflow-hidden">
                  <img
                    src={imgUrl}
                    alt={gif.label ?? gif.storage_path}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50%" x="50%" dominant-baseline="middle" text-anchor="middle" font-size="40">🖼️</text></svg>'; }}
                  />
                </div>

                {/* Info */}
                <div className="p-2 space-y-1">
                  <p className="font-bold text-xs text-slate-700 truncate">{gif.label || gif.storage_path}</p>
                  {lesson && (
                    <p className="text-[10px] text-purple-600 font-bold truncate">{lesson.icon} {lesson.title}</p>
                  )}
                  <p className="text-[10px] text-slate-400 truncate">{typeLabel}</p>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(gif)}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                  title="Xóa GIF"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Copy URL button */}
                <button
                  onClick={() => { navigator.clipboard.writeText(imgUrl); }}
                  className="absolute top-2 left-2 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-blue-600 text-[10px] font-black"
                  title="Copy URL"
                >
                  🔗
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
