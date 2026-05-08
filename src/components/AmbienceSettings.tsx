import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getAppSetting, setAppSetting, getMusicTracks, deleteMusicTrack, MusicTrack } from '../lib/store';
import { bgMusic } from '../lib/bgMusic';
import WeatherEffect, { WeatherType } from './WeatherEffect';
import { Upload, Trash2, Music, Cloud, Play, Pause, Volume2, Check, AlertTriangle, Image, Link, Timer } from 'lucide-react';

const WEATHER_OPTIONS: { type: WeatherType; label: string; emoji: string }[] = [
  { type: 'none',   label: 'Tắt',         emoji: '🚫' },
  { type: 'snow',   label: 'Tuyết rơi',   emoji: '❄️' },
  { type: 'rain',   label: 'Mưa rơi',     emoji: '🌧️' },
  { type: 'hail',   label: 'Mưa đá',      emoji: '🌨️' },
  { type: 'leaves', label: 'Lá rơi',      emoji: '🍂' },
  { type: 'petals', label: 'Hoa anh đào', emoji: '🌸' },
];

// Preset nền home
export const BG_PRESETS: { id: string; label: string; value: string; preview: string }[] = [
  { id: 'default',  label: 'Mặc định',    value: '#FFFBEB',                                                   preview: 'bg-amber-50' },
  { id: 'purple',   label: 'Tím mộng',    value: 'linear-gradient(135deg,#667eea,#764ba2)',                   preview: 'bg-purple-400' },
  { id: 'ocean',    label: 'Đại dương',   value: 'linear-gradient(135deg,#43cea2,#185a9d)',                   preview: 'bg-teal-400' },
  { id: 'sunset',   label: 'Hoàng hôn',   value: 'linear-gradient(135deg,#f093fb,#f5576c)',                   preview: 'bg-pink-400' },
  { id: 'sky',      label: 'Bầu trời',    value: 'linear-gradient(135deg,#89f7fe,#66a6ff)',                   preview: 'bg-sky-300' },
  { id: 'forest',   label: 'Rừng xanh',   value: 'linear-gradient(135deg,#56ab2f,#a8e063)',                   preview: 'bg-green-400' },
  { id: 'candy',    label: 'Kẹo ngọt',    value: 'linear-gradient(135deg,#f7971e,#ffd200)',                   preview: 'bg-yellow-300' },
  { id: 'night',    label: 'Đêm huyền',   value: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',           preview: 'bg-indigo-900' },
  { id: 'aurora',   label: 'Cực quang',   value: 'linear-gradient(135deg,#00b09b,#96c93d,#667eea)',           preview: 'bg-emerald-400' },
  { id: 'cherry',   label: 'Hoa anh đào', value: 'linear-gradient(135deg,#ffecd2,#fcb69f)',                   preview: 'bg-rose-200' },
];

export type HomeBgSetting = { type: 'preset' | 'image' | 'color'; value: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const MUSIC_BUCKET = 'music';
const BG_BUCKET = 'backgrounds';
function getPublicUrl(bucket: string, path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

interface MusicSetting { enabled: boolean; volume: number; track_id: string | null; }
interface WeatherSetting { type: WeatherType; enabled: boolean; }

export default function AmbienceSettings() {
  const [weather, setWeather] = useState<WeatherSetting>({ type: 'none', enabled: false });
  const [music, setMusic] = useState<MusicSetting>({ enabled: false, volume: 0.5, track_id: null });
  const [homeBg, setHomeBg] = useState<HomeBgSetting>({ type: 'preset', value: '#FFFBEB' });
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [uploading, setUploading] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dbReady, setDbReady] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadLabel, setUploadLabel] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [bgUrlInput, setBgUrlInput] = useState('');
  const [bgInputMode, setBgInputMode] = useState<'preset' | 'url' | 'upload'>('preset');
  // Preview hiệu ứng ngay trên màn hình (portal)
  const [previewWeather, setPreviewWeather] = useState<WeatherType>('none');
  const [questionTimer, setQuestionTimer] = useState<number>(0); // 0 = tắt
  const fileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [w, m, t, bg, qt] = await Promise.all([
          getAppSetting<WeatherSetting>('weather', { type: 'none', enabled: false }),
          getAppSetting<MusicSetting>('music', { enabled: false, volume: 0.5, track_id: null }),
          getMusicTracks(),
          getAppSetting<HomeBgSetting>('home_bg', { type: 'preset', value: '#FFFBEB' }),
          getAppSetting<number>('question_timer', 0),
        ]);
        setWeather(w); setPreviewWeather(w.enabled ? w.type : 'none');
        setMusic(m); setHomeBg(bg); setQuestionTimer(qt);
        setTracks(t);
        bgMusic.setVolume(m.volume);
        setDbReady(true);
      } catch { setDbReady(false); }
    })();
  }, []);

  const save = async (updates: Record<string, unknown>) => {
    setSaving(true); setSaved(false);
    try {
      await Promise.all(Object.entries(updates).map(([k, v]) => setAppSetting(k, v)));
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e: any) { setError('Lỗi lưu: ' + (e?.message ?? '')); }
    finally { setSaving(false); }
  };

  const handleWeatherChange = async (type: WeatherType) => {
    const nw: WeatherSetting = { type, enabled: type !== 'none' };
    setWeather(nw); setPreviewWeather(type);
    await save({ weather: nw });
  };

  const handleMusicToggle = async () => {
    const nm = { ...music, enabled: !music.enabled };
    setMusic(nm); bgMusic.setEnabled(nm.enabled);
    await save({ music: nm });
  };

  const handleVolumeChange = async (v: number) => {
    const nm = { ...music, volume: v };
    setMusic(nm); bgMusic.setVolume(v);
    await save({ music: nm });
  };

  const handleTrackSelect = async (trackId: string | null) => {
    const track = tracks.find(t => t.id === trackId);
    const nm = { ...music, track_id: trackId };
    setMusic(nm); bgMusic.load(track?.url ?? null);
    if (nm.enabled) bgMusic.play();
    await save({ music: nm });
  };

  const handleBgPreset = async (preset: typeof BG_PRESETS[0]) => {
    const nb: HomeBgSetting = { type: 'preset', value: preset.value };
    setHomeBg(nb); await save({ home_bg: nb });
  };

  const handleBgUrl = async () => {
    if (!bgUrlInput.trim()) return;
    const nb: HomeBgSetting = { type: 'image', value: bgUrlInput.trim() };
    setHomeBg(nb); await save({ home_bg: nb });
  };

  const handleBgUpload = async (file: File) => {
    setBgUploading(true); setError(null);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `bg_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BG_BUCKET).upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const url = getPublicUrl(BG_BUCKET, path);
      const nb: HomeBgSetting = { type: 'image', value: url };
      setHomeBg(nb); await save({ home_bg: nb });
    } catch (e: any) { setError(e?.message ?? 'Upload thất bại'); }
    finally { setBgUploading(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setSelectedFile(f); setPreviewName(f.name);
    if (!uploadLabel) setUploadLabel(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleMusicUpload = async () => {
    if (!selectedFile) return;
    setUploading(true); setError(null);
    try {
      const ext = selectedFile.name.split('.').pop() ?? 'mp3';
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(MUSIC_BUCKET).upload(path, selectedFile);
      if (upErr) throw upErr;
      const url = getPublicUrl(MUSIC_BUCKET, path);
      const { data, error: dbErr } = await supabase.from('music_tracks').insert({
        label: uploadLabel || selectedFile.name, storage_path: path, url, sort_order: tracks.length,
      }).select().single();
      if (dbErr) throw dbErr;
      setTracks(prev => [...prev, data as MusicTrack]);
      setSelectedFile(null); setUploadLabel(''); setPreviewName('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) { setError(e?.message ?? 'Upload thất bại'); }
    finally { setUploading(false); }
  };

  const handleDeleteTrack = async (track: MusicTrack) => {
    if (!confirm(`Xóa "${track.label}"?`)) return;
    await deleteMusicTrack(track);
    setTracks(prev => prev.filter(t => t.id !== track.id));
    if (music.track_id === track.id) {
      const nm = { ...music, track_id: null };
      setMusic(nm); bgMusic.load(null); await save({ music: nm });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Weather preview — portal: không bị clip bởi overflow:hidden */}
      <WeatherEffect type={previewWeather} enabled={previewWeather !== 'none'} mode="portal" />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl sm:text-3xl font-black text-[#1E293B]">🎨 Hiệu ứng &amp; Nhạc nền</h2>
        <div className="flex items-center gap-2">
          {saving && <span className="text-sm font-bold text-purple-500 flex items-center gap-1.5"><div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"/>Đang lưu...</span>}
          {saved && <span className="text-sm font-bold text-green-500 flex items-center gap-1.5"><Check className="w-4 h-4"/>Đã lưu!</span>}
        </div>
      </div>

      {!dbReady && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"/>
          <div>
            <p className="font-black text-amber-700 text-sm mb-1">⚠️ DB chưa sẵn sàng — lưu cục bộ (localStorage)</p>
            <code className="text-xs bg-amber-100 px-2 py-1 rounded font-mono block">supabase/migrations/20240508_app_settings_music.sql</code>
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 text-red-700 font-bold text-sm flex justify-between">
        <span>{error}</span><button onClick={() => setError(null)} className="font-black ml-4">✕</button>
      </div>}

      {/* ══ 1. Nền trang chủ ══ */}
      <div className="bg-white rounded-3xl border-2 border-emerald-200 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-black text-lg text-emerald-700 flex items-center gap-2"><Image className="w-5 h-5"/>Nền trang chủ học sinh</h3>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 border-b-2 border-slate-100 pb-3">
          {[
            { id: 'preset', label: '🎨 Màu sắc' },
            { id: 'url',    label: '🔗 URL ảnh' },
            { id: 'upload', label: '📤 Upload' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setBgInputMode(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold text-sm transition-all ${
                bgInputMode === tab.id ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300' : 'text-slate-500 hover:bg-slate-50'
              }`}>{tab.label}</button>
          ))}
        </div>

        {bgInputMode === 'preset' && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {BG_PRESETS.map(p => (
              <button key={p.id} onClick={() => handleBgPreset(p)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all hover:scale-105 ${
                  homeBg.type === 'preset' && homeBg.value === p.value ? 'border-emerald-500 shadow-md scale-105' : 'border-slate-200'
                }`}>
                <div className={`w-full h-10 rounded-lg ${p.preview}`} style={{ background: p.value }} />
                <span className="text-[11px] font-black text-center leading-tight">{p.label}</span>
                {homeBg.type === 'preset' && homeBg.value === p.value && (
                  <Check className="w-3 h-3 text-emerald-600"/>
                )}
              </button>
            ))}
          </div>
        )}

        {bgInputMode === 'url' && (
          <div className="flex gap-2">
            <input value={bgUrlInput} onChange={e => setBgUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg hoặc URL ảnh bất kỳ"
              className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-emerald-400 outline-none"/>
            <button onClick={handleBgUrl} disabled={!bgUrlInput.trim()}
              className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-black disabled:opacity-40 hover:bg-emerald-600 flex items-center gap-2">
              <Link className="w-4 h-4"/>Áp dụng
            </button>
          </div>
        )}

        {bgInputMode === 'upload' && (
          <div className="space-y-3">
            <div onClick={() => bgFileRef.current?.click()}
              className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors">
              {bgUploading ? (
                <div className="w-8 h-8 border-4 border-emerald-300 border-t-emerald-600 rounded-full animate-spin"/>
              ) : (
                <Upload className="w-8 h-8 text-emerald-300"/>
              )}
              <p className="text-sm font-bold text-slate-500">{bgUploading ? 'Đang upload...' : 'Click để chọn ảnh nền (JPG, PNG, GIF, WebP)'}</p>
              <input ref={bgFileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if(f) handleBgUpload(f); }}/>
            </div>
          </div>
        )}

        {/* Preview hiển thị nền hiện tại */}
        <div className="rounded-2xl overflow-hidden border-2 border-slate-200 h-20 flex items-center justify-center relative"
          style={homeBg.type === 'image' ? { backgroundImage: `url(${homeBg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: homeBg.value }}>
          <span className="bg-black/40 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">Preview nền hiện tại</span>
        </div>
      </div>

      {/* ══ 2. Hiệu ứng thời tiết ══ */}
      <div className="bg-white rounded-3xl border-2 border-blue-200 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-black text-lg text-blue-700 flex items-center gap-2"><Cloud className="w-5 h-5"/>Hiệu ứng thời tiết</h3>
          <span className="text-xs bg-blue-50 text-blue-600 font-bold px-3 py-1 rounded-full border border-blue-200">
            👁️ Preview ngay khi click
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {WEATHER_OPTIONS.map(opt => (
            <button key={opt.type} onClick={() => handleWeatherChange(opt.type)}
              className={`flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-2xl border-2 transition-all hover:scale-105 active:scale-95 ${
                weather.type === opt.type ? 'border-blue-500 bg-blue-50 shadow-md scale-105' : 'border-slate-200 hover:border-blue-300 bg-white'
              }`}>
              <span className="text-3xl">{opt.emoji}</span>
              <span className="font-black text-sm">{opt.label}</span>
              {weather.type === opt.type && <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">✓ Đang áp dụng</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ══ 3. Nhạc nền ══ */}
      <div className="bg-white rounded-3xl border-2 border-purple-200 p-5 sm:p-6 space-y-5">
        <h3 className="font-black text-lg text-purple-700 flex items-center gap-2"><Music className="w-5 h-5"/>Nhạc nền</h3>

        <div className="flex flex-wrap items-center gap-4">
          <button onClick={handleMusicToggle}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl font-black border-2 transition-all ${
              music.enabled ? 'bg-green-500 text-white border-green-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-green-300'
            }`}>
            {music.enabled ? <><Play className="w-4 h-4"/>Đang bật</> : <><Pause className="w-4 h-4"/>Đang tắt</>}
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-[180px]">
            <Volume2 className="w-5 h-5 text-slate-400 shrink-0"/>
            <input type="range" min={0} max={100} value={Math.round(music.volume * 100)}
              onChange={e => handleVolumeChange(Number(e.target.value) / 100)}
              className="flex-1 accent-purple-500"/>
            <span className="text-sm font-black text-slate-600 w-10 text-right">{Math.round(music.volume * 100)}%</span>
          </div>
        </div>

        <div className="bg-purple-50 rounded-2xl px-4 py-3 text-sm">
          <span className="font-bold text-purple-600">🎵 Đang chọn: </span>
          <span className="font-black text-purple-800">
            {music.track_id ? (tracks.find(t => t.id === music.track_id)?.label ?? '?') : '🎼 Nhạc mặc định (Gymnopedie No.1)'}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-black text-slate-500 uppercase">Chọn bài nhạc:</p>
          <button onClick={() => handleTrackSelect(null)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 font-bold text-sm transition-all ${
              !music.track_id ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-slate-200 hover:border-purple-300 text-slate-600'
            }`}>
            <span className="text-xl">🎼</span><span className="flex-1 text-left">Nhạc mặc định (Gymnopedie No.1)</span>
            {!music.track_id && <Check className="w-4 h-4 text-purple-600"/>}
          </button>
          {tracks.map(track => (
            <div key={track.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
              music.track_id === track.id ? 'border-purple-400 bg-purple-50' : 'border-slate-200'
            }`}>
              <button onClick={() => handleTrackSelect(track.id)} className="flex-1 flex items-center gap-3 text-left">
                <span className="text-xl">🎵</span>
                <span className={`font-bold text-sm ${music.track_id === track.id ? 'text-purple-700' : 'text-slate-600'}`}>{track.label}</span>
                {music.track_id === track.id && <Check className="w-4 h-4 text-purple-600 ml-auto"/>}
              </button>
              <button onClick={() => handleDeleteTrack(track)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4"/>
              </button>
            </div>
          ))}
          {tracks.length === 0 && <p className="text-slate-400 text-sm font-bold text-center py-2">Chưa có bài nào được upload</p>}
        </div>

        <div className="border-t-2 border-slate-100 pt-4 space-y-3">
          <p className="text-xs font-black text-slate-500 uppercase">Upload nhạc mới:</p>
          <input value={uploadLabel} onChange={e => setUploadLabel(e.target.value)}
            placeholder="Tên bài nhạc" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-purple-400 outline-none"/>
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-colors">
            <Music className="w-7 h-7 text-purple-300"/>
            <p className="text-sm font-bold text-slate-500">{previewName || 'Click để chọn file âm thanh (MP3, OGG, WAV)'}</p>
            <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFileChange}/>
          </div>
          <button onClick={handleMusicUpload} disabled={!selectedFile || uploading}
            className={`w-full py-3 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all ${
              !selectedFile || uploading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-purple-500 hover:bg-purple-600 border-b-4 border-purple-700'
            }`}>
            {uploading ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/>Đang upload...</>
              : <><Upload className="w-4 h-4"/>Upload nhạc</>}
          </button>
        </div>
      </div>

      {/* ══ 4. Bộ đếm thời gian ══ */}
      <div className="bg-white rounded-3xl border-2 border-orange-200 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-black text-lg text-orange-600 flex items-center gap-2"><Timer className="w-5 h-5"/>Bộ đếm thời gian trả lời</h3>
          {questionTimer > 0 && (
            <span className="text-xs bg-orange-50 text-orange-600 font-bold px-3 py-1 rounded-full border border-orange-200">
              ⏱ {questionTimer}s / câu
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500">Học sinh phải trả lời trong thời gian này. Hết giờ → tự động chuyển câu (tính sai).</p>

        {/* Preset buttons */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {[0, 10, 15, 20, 30, 45, 60].map(sec => (
            <button key={sec}
              onClick={async () => { setQuestionTimer(sec); await save({ question_timer: sec }); }}
              className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-2 font-black text-sm transition-all hover:scale-105 ${
                questionTimer === sec ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md scale-105' : 'border-slate-200 hover:border-orange-300 text-slate-600'
              }`}>
              {sec === 0 ? <><span className="text-lg">🚫</span><span className="text-xs">Tắt</span></> : <><span className="text-lg">⏱</span><span className="text-xs">{sec}s</span></>}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-500 shrink-0">Tuỳ chỉnh:</span>
          <input
            type="number" min={0} max={300} value={questionTimer}
            onChange={e => setQuestionTimer(Number(e.target.value))}
            className="w-24 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-center focus:border-orange-400 outline-none"
          />
          <span className="text-sm font-bold text-slate-400">giây</span>
          <button onClick={async () => { await save({ question_timer: questionTimer }); }}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-sm transition-all">
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
