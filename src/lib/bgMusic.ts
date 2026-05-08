/**
 * bgMusic.ts — Singleton quản lý nhạc nền toàn app
 * Creative Commons default: "Gymnopedie No.1" by Erik Satie (CC0/Public Domain)
 * via musopen.org
 */

// Nhạc mặc định Creative Commons (CC BY 4.0) — Kevin MacLeod "Gymnopedie No. 1"
// Source: incompetech.com | License: CC BY 4.0
const DEFAULT_MUSIC_URL =
  'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Gymnopedie%20No%201.mp3';

class BgMusicManager {
  private audio: HTMLAudioElement | null = null;
  private _volume: number = 0.5;
  private _enabled: boolean = false;
  private _currentUrl: string = DEFAULT_MUSIC_URL;
  private _ready: boolean = false;

  private ensureAudio() {
    if (this.audio) return;
    this.audio = new Audio();
    this.audio.loop = true;
    this.audio.volume = this._volume;
    this.audio.src = this._currentUrl;
    this.audio.preload = 'metadata';
    this._ready = true;
  }

  /** Tải bài nhạc mới (URL từ Supabase hoặc mặc định) */
  load(url?: string | null) {
    const src = url || DEFAULT_MUSIC_URL;
    if (src === this._currentUrl && this.audio) return; // Không reload nếu cùng bài
    this._currentUrl = src;
    if (this.audio) {
      const wasPlaying = !this.audio.paused;
      this.audio.src = src;
      this.audio.load();
      if (wasPlaying) {
        this.audio.play().catch(() => {});
      }
    }
  }

  /** Phát nhạc — dùng muted autoplay trick để phát ngay không cần user gesture */
  play() {
    if (!this._enabled) return;
    this.ensureAudio();
    if (!this.audio) return;
    if (!this.audio.paused) return; // đang chạy rồi

    // Trick: bắt đầu muted (browser luôn cho phép), sau đó unmute ngay
    this.audio.muted = true;
    this.audio.play().then(() => {
      // Phát thành công → unmute ngay
      if (this.audio) this.audio.muted = false;
      this._removeAutoplayListeners();
    }).catch(() => {
      // Vẫn bị chặn hoàn toàn (rất hiếm) → chờ gesture
      if (this.audio) this.audio.muted = false;
      this._addAutoplayListeners();
    });
  }

  private _autoplayBound = () => this._retryPlay();
  private _autoplayEvents = ['click', 'keydown', 'touchstart', 'pointerdown'] as const;

  private _addAutoplayListeners() {
    this._autoplayEvents.forEach(ev =>
      document.addEventListener(ev, this._autoplayBound, { once: false, passive: true })
    );
  }

  private _removeAutoplayListeners() {
    this._autoplayEvents.forEach(ev =>
      document.removeEventListener(ev, this._autoplayBound)
    );
  }

  private _retryPlay() {
    if (!this._enabled || !this.audio || !this.audio.paused) {
      this._removeAutoplayListeners();
      return;
    }
    this.audio.muted = true;
    this.audio.play().then(() => {
      if (this.audio) this.audio.muted = false;
      this._removeAutoplayListeners();
    }).catch(() => {});
  }

  /** Dừng nhạc (tạm dừng, giữ vị trí) */
  pause() {
    this.audio?.pause();
  }

  /** Dừng hoàn toàn và về đầu */
  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  /** Bật/tắt nhạc nền */
  setEnabled(enabled: boolean) {
    this._enabled = enabled;
    if (!enabled) {
      this.pause();
    } else {
      this.play();
    }
  }

  get enabled() { return this._enabled; }

  /** Âm lượng 0–1 */
  setVolume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    this.ensureAudio();
    if (this.audio) this.audio.volume = this._volume;
  }

  get volume() { return this._volume; }

  isPlaying() {
    return !!this.audio && !this.audio.paused;
  }

  get currentUrl() { return this._currentUrl; }
  get defaultUrl() { return DEFAULT_MUSIC_URL; }
}

export const bgMusic = new BgMusicManager();
