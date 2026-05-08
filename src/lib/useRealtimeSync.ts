/**
 * useRealtimeSync — Singleton Realtime subscription cho toàn app
 *
 * Chỉ tạo 1 channel duy nhất (tránh lỗi "cannot add callbacks after subscribe").
 * Nhiều component có thể đăng ký callback thông qua hook này.
 */
import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { bgMusic } from './bgMusic';
import { getMusicTracks, loadAllData } from './store';

// ── Singleton state ──────────────────────────────────────────────────────────

type SettingCallback = (key: string, value: unknown) => void;
type ContentCallback = () => void;

const _settingListeners = new Set<SettingCallback>();
const _contentListeners = new Set<ContentCallback>();
let _initialized = false;
let _contentReloadTimer: ReturnType<typeof setTimeout> | null = null;

function initRealtimeChannels() {
  if (_initialized || !isSupabaseConfigured) return;
  _initialized = true;

  // ── 1. app_settings ────────────────────────────────────────────────────────
  supabase
    .channel(`hvtv_settings_${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_settings' },
      (payload) => {
        const row = (payload.new ?? payload.old) as { key?: string; value?: unknown } | null;
        if (!row?.key) return;
        const { key, value } = row;

        // Cập nhật localStorage cache
        localStorage.setItem('hvtv_setting_' + key, JSON.stringify(value));

        // Áp dụng music ngay lập tức
        if (key === 'music' && value && typeof value === 'object') {
          const m = value as { enabled: boolean; volume: number; track_id: string | null };
          bgMusic.setVolume(m.volume);
          if (m.enabled) {
            getMusicTracks().then(tracks => {
              const track = tracks.find(t => t.id === m.track_id);
              bgMusic.load(track?.url ?? null);
              bgMusic.setEnabled(true);
              bgMusic.play();
            });
          } else {
            bgMusic.setEnabled(false);
          }
        }

        // Notify tất cả listeners
        _settingListeners.forEach(cb => cb(key, value));
      }
    )
    .subscribe();

  // ── 2. Content tables ───────────────────────────────────────────────────────
  supabase
    .channel(`hvtv_content_${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons' },    scheduleContentReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, scheduleContentReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' },  scheduleContentReload)
    .subscribe();
}

function scheduleContentReload() {
  if (_contentReloadTimer) clearTimeout(_contentReloadTimer);
  _contentReloadTimer = setTimeout(async () => {
    await loadAllData();
    _contentListeners.forEach(cb => cb());
  }, 800);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface RealtimeSyncOptions {
  onSettingChange?: (key: string, value: unknown) => void;
  onContentChange?: () => void;
}

export function useRealtimeSync(options: RealtimeSyncOptions) {
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    // Khởi tạo channels một lần duy nhất toàn app
    initRealtimeChannels();

    // Đăng ký callbacks cho instance này
    const onSetting: SettingCallback = (key, value) => optsRef.current.onSettingChange?.(key, value);
    const onContent: ContentCallback = () => optsRef.current.onContentChange?.();

    if (options.onSettingChange) _settingListeners.add(onSetting);
    if (options.onContentChange) _contentListeners.add(onContent);

    return () => {
      _settingListeners.delete(onSetting);
      _contentListeners.delete(onContent);
    };
  }, []);
}
