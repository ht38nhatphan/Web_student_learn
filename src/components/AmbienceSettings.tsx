import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getAppSetting, setAppSetting, getMusicTracks, deleteMusicTrack, MusicTrack } from '../lib/store';
import { bgMusic } from '../lib/bgMusic';
import WeatherEffect, { WeatherType } from './WeatherEffect';
import { Upload, Trash2, Music, Cloud, Play, Pause, Volume2, Check, AlertTriangle } from 'lucide-react';

const WEATHER_OPTIONS: { type: WeatherType; label: string; emoji: string; desc: string }[] = [
  { type: 'none',   label: 'Tắt',         emoji: '🚫', desc: 'Không có hiệu ứng' },
  { type: 'snow',   label: 'Tuyết rơi',   emoji: '❄️', desc: 'Bông tuyết nhẹ nhàng' },
  { type: 'rain',   label: 'Mưa rơi',     emoji: '🌧️', desc: 'Mưa nhỏ lác đác' },
  { type: 'hail',   label: 'Mưa đá',      emoji: '🌨️', desc: 'Hạt mưa đá nhảy lên' },
  { type: 'leaves', label: 'Lá rơi',      emoji: '🍂', desc: 'Lá mùa thu xoay rơi' },
  { type: 'petals', label: 'Hoa anh đào', emoji: '🌸', desc: 'Cánh hoa bay lơ lửng' },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const MUSIC_BUCKET = 'music';
function getMusicPublicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${MUSIC_BUCKET}/${path}`;
}

interface MusicSetting { enabled: boolean; volume: number; track_id: string | null; }
interface WeatherSetting { type: WeatherType; enabled: boolean; }

export default function AmbienceSettings() {
  const [weather, setWeather] = useState<WeatherSetting>({ type: 'none', enabled: false });
  const [music, setMusic] = useState<MusicSetting>({ enabled: false, volume: 0.5, track_id: null });
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dbReady, setDbReady] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadLabel, setUploadLabel] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewName, setPreviewName] = useState('');
  // Preview hiệu ứng ngay trên màn hình giáo viên (portal)
  const [previewWeather, setPreviewWeather] = useState<WeatherType>('none');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [w, m, t] = await Promise.all([
          getAppSetting<WeatherSetting>('weather', { type: 'none', enabled: false }),
          getAppSetting<MusicSetting>('music', { enabled: false, volume: 0.5, track_id: null }),
          getMusicTracks(),
        ]);
        setWeather(w);
        setPreviewWeather(w.enabled ? w.type : 'none');
        setMusic(m);
        setTracks(t);
        bgMusic.setVolume(m.volume);
        setDbReady(true);
      } catch {
        setDbReady(false);
      }
    })();
  }, []);

  const save = async (newWeather?: WeatherSetting, newMusic?: MusicSetting) => {
    setSaving(true); setSaved(false);
    try {
      if (newWeather) await setAppSetting('weather', newWeather);
      if (newMusic) await setAppSetting('music', newMusic);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError('Lỗi lưu: ' + (e?.message ?? ''));
    }
    finally { setSaving(false); }
  };

  const handleWeatherChange = async (type: WeatherType) => {
    const nw: WeatherSetting = { type, enabled: type !== 'none' };
    setWeather(nw);
    setPreviewWeather(type); // Preview ngay lập tức kể cả chưa có DB
    await save(nw, undefined);
  };

  const handleMusicToggle = async () => {
    const nm = { ...music, enabled: !music.enabled };
    setMusic(nm);
    bgMusic.setEnabled(nm.enabled);
    await save(undefined, nm);
  };

  const handleVolumeChange = async (v: number) => {
    const nm = { ...music, volume: v };
    setMusic(nm);
    bgMusic.setVolume(v);
    await save(undefined, nm);
  };

  const handleTrackSelect = async (trackId: string | null) => {
    const track = tracks.find(t => t.id === trackId);
    const nm = { ...music, track_id: trackId };
    setMusic(nm);
    bgMusic.load(track?.url ?? null);
    if (nm.enabled) bgMusic.play();
    await save(undefined, nm);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setSelectedFile(f);
    setPreviewName(f.name);
    if (!uploadLabel) setUploadLabel(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true); setError(null);
    try {
      const ext = selectedFile.name.split('.').pop() ?? 'mp3';
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(MUSIC_BUCKET).upload(path, selectedFile);
      if (upErr) throw upErr;
      const url = getMusicPublicUrl(path);
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

  const handleDelete = async (track: MusicTrack) => {
    if (!confirm(`Xóa "${track.label}"?`)) return;
    await deleteMusicTrack(track);
    setTracks(prev => prev.filter(t => t.id !== track.id));
    if (music.track_id === track.id) {
      const nm = { ...music, track_id: null };
      setMusic(nm); bgMusic.load(null);
      await save(undefined, nm);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Weather preview — portal mode: không bị clip bởi overflow:hidden */}
      <WeatherEffect type={previewWeather} enabled={previewWeather !== 'none'} mode="portal" />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-black text-[#1E293B]">🎨 Hiệu ứng &amp; Nhạc nền</h2>
        <div className="flex items-center gap-2">
          {saving && <span className="text-sm font-bold text-purple-500 flex items-center gap-2"><div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"/>Đang lưu...</span>}
          {saved && <span className="text-sm font-bold text-green-500 flex items-center gap-2"><Check className="w-4 h-4"/>Đã lưu!</span>}
        </div>
      </div>

      {!dbReady && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"/>
          <div>
            <p className="font-black text-amber-700 text-sm mb-1">⚠️ DB chưa sẵn sàng — hiệu ứng vẫn lưu cục bộ!</p>
            <p className="text-xs text-amber-600 font-bold">Để sync qua Supabase, chạy migration SQL:</p>
            <code className="text-xs bg-amber-100 px-2 py-1 rounded font-mono block mt-1">supabase/migrations/20240508_app_settings_music.sql</code>
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 text-red-700 font-bold text-sm flex justify-between">
        <span>{error}</span><button onClick={() => setError(null)} className="font-black ml-4">✕</button>
      </div>}

      {/* ── Weather Section ── */}
      <div className="bg-white rounded-3xl border-2 border-blue-200 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-black text-lg text-blue-700 flex items-center gap-2"><Cloud className="w-5 h-5"/>Hiệu ứng thời tiết</h3>
          <span className="text-xs bg-blue-50 text-blue-600 font-bold px-3 py-1 rounded-full border border-blue-200 animate-pulse">
            👁️ Preview ngay trên màn hình này
          </span>
        </div>
        <p className="text-sm text-slate-500">Click để chọn và xem preview. Hiệu ứng sẽ áp dụng cho trang chủ học sinh.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {WEATHER_OPTIONS.map(opt => (
            <button key={opt.type} onClick={() => handleWeatherChange(opt.type)}
              className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border-2 transition-all hover:scale-105 active:scale-95 ${
                weather.type === opt.type
                  ? 'border-blue-500 bg-blue-50 shadow-md scale-105'
                  : 'border-slate-200 hover:border-blue-300 bg-white'
              }`}>
              <span className="text-3xl">{opt.emoji}</span>
              <span className="font-black text-sm text-center leading-tight">{opt.label}</span>
              <span className="text-[10px] text-slate-400 text-center hidden sm:block">{opt.desc}</span>
              {weather.type === opt.type && (
                <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">✓ Đang áp dụng</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Music Section ── */}
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
              className="flex-1 accent-purple-500" />
            <span className="text-sm font-black text-slate-600 w-10 text-right">{Math.round(music.volume * 100)}%</span>
          </div>
        </div>

        <div className="bg-purple-50 rounded-2xl px-4 py-3 text-sm">
          <span className="font-bold text-purple-600">🎵 Đang chọn: </span>
          <span className="font-black text-purple-800">
            {music.track_id
              ? (tracks.find(t => t.id === music.track_id)?.label ?? 'Không tìm thấy')
              : '🎼 Nhạc mặc định (Gymnopedie No.1 – Kevin MacLeod, CC BY)'}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-black text-slate-500 uppercase">Chọn bài nhạc:</p>
          <button onClick={() => handleTrackSelect(null)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 font-bold text-sm transition-all ${
              !music.track_id ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-slate-200 hover:border-purple-300 text-slate-600'
            }`}>
            <span className="text-xl">🎼</span>
            <span className="flex-1 text-left">Nhạc mặc định (Gymnopedie No.1)</span>
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
              <button onClick={() => handleDelete(track)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4"/>
              </button>
            </div>
          ))}
          {tracks.length === 0 && <p className="text-slate-400 text-sm font-bold text-center py-3">Chưa có bài nào được upload</p>}
        </div>

        <div className="border-t-2 border-slate-100 pt-4 space-y-3">
          <p className="text-xs font-black text-slate-500 uppercase">Upload nhạc mới (MP3, OGG, WAV):</p>
          <input value={uploadLabel} onChange={e => setUploadLabel(e.target.value)}
            placeholder="Tên bài nhạc" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-purple-400 outline-none"/>
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-2xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-colors">
            <Music className="w-8 h-8 text-purple-300"/>
            <p className="text-sm font-bold text-slate-500">{previewName || 'Click để chọn file âm thanh'}</p>
            <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFileChange}/>
          </div>
          <button onClick={handleUpload} disabled={!selectedFile || uploading}
            className={`w-full py-3 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all ${
              !selectedFile || uploading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-purple-500 hover:bg-purple-600 border-b-4 border-purple-700'
            }`}>
            {uploading ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/>Đang upload...</>
              : <><Upload className="w-4 h-4"/>Upload nhạc</>}
          </button>
        </div>
      </div>
    </div>
  );
}
