/**
 * SoundManager — Singleton Web Audio API
 * Quản lý toàn bộ âm thanh trong app HVTV
 */

type SoundKey =
  | 'app_open'       // Vào app
  | 'lesson_open'    // Mở bài học
  | 'challenge_start'// Bắt đầu thử thách
  | 'select'         // Chọn đáp án
  | 'correct'        // Trả lời đúng
  | 'wrong'          // Trả lời sai
  | 'star_gain'      // Cộng sao
  | 'star_loss'      // Trừ sao
  | 'question_done'  // Xong 1 câu
  | 'challenge_done' // Hoàn thành thử thách
  | 'victory'        // Đạt ≥80% — chiến thắng
  | 'save_ok'        // Giáo viên lưu thành công
  | 'warning';       // Cảnh báo / lỗi

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;
  private bgGain: GainNode | null = null;
  private bgPlaying = false;
  private lastPlayed: Partial<Record<SoundKey, number>> = {};
  private readonly THROTTLE_MS = 150;

  constructor() {
    this.muted = localStorage.getItem('hvtv_muted') === '1';
  }

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  private async resume() {
    const c = this.getCtx();
    if (c.state === 'suspended') await c.resume();
  }

  /** Tạo 1 nốt nhạc đơn */
  private note(
    freq: number, start: number, dur: number,
    type: OscillatorType = 'sine', vol = 0.18
  ) {
    const c = this.getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  /** Phát âm thanh theo key, có throttle */
  async play(key: SoundKey) {
    if (this.muted) return;
    const now = Date.now();
    if (now - (this.lastPlayed[key] ?? 0) < this.THROTTLE_MS) return;
    this.lastPlayed[key] = now;
    await this.resume();
    const c = this.getCtx();
    const t = c.currentTime;

    switch (key) {
      // 🟢 Vào app — chào đón
      case 'app_open':
        this.note(523, t,       0.10, 'sine', 0.14);
        this.note(659, t + 0.1, 0.10, 'sine', 0.14);
        this.note(784, t + 0.2, 0.18, 'sine', 0.16);
        break;

      // 🟡 Mở bài học — tươi sáng
      case 'lesson_open':
        this.note(440, t,       0.08, 'triangle', 0.16);
        this.note(554, t + 0.1, 0.08, 'triangle', 0.16);
        this.note(659, t + 0.2, 0.15, 'triangle', 0.18);
        break;

      // 🚀 Bắt đầu thử thách — energetic
      case 'challenge_start':
        this.note(392, t,       0.06, 'square', 0.10);
        this.note(523, t + 0.07, 0.06, 'square', 0.10);
        this.note(659, t + 0.14, 0.06, 'square', 0.10);
        this.note(784, t + 0.21, 0.18, 'square', 0.12);
        break;

      // 👆 Chọn đáp án — click nhẹ
      case 'select':
        this.note(880, t, 0.05, 'sine', 0.07);
        break;

      // ✅ Trả lời đúng — arpeggio vui
      case 'correct':
        this.note(523, t,        0.10, 'sine', 0.20);
        this.note(659, t + 0.08, 0.10, 'sine', 0.20);
        this.note(784, t + 0.16, 0.10, 'sine', 0.20);
        this.note(1047, t + 0.24, 0.22, 'sine', 0.24);
        break;

      // ❌ Trả lời sai — buzz đỏ
      case 'wrong':
        this.note(180, t,       0.12, 'sawtooth', 0.18);
        this.note(160, t + 0.1, 0.14, 'sawtooth', 0.14);
        break;

      // ⭐ Cộng sao — ding vàng
      case 'star_gain':
        this.note(880,  t,       0.06, 'sine', 0.14);
        this.note(1108, t + 0.05, 0.16, 'sine', 0.12);
        break;

      // 💔 Trừ sao — thump
      case 'star_loss':
        this.note(150, t, 0.18, 'sawtooth', 0.20);
        break;

      // ✔ Xong 1 câu — nhẹ hơn correct
      case 'question_done':
        this.note(659, t,       0.08, 'sine', 0.12);
        this.note(784, t + 0.08, 0.14, 'sine', 0.14);
        break;

      // 🏁 Hoàn thành thử thách — fanfare 4 nốt
      case 'challenge_done':
        this.note(784,  t,        0.13, 'triangle', 0.22);
        this.note(784,  t + 0.12, 0.13, 'triangle', 0.22);
        this.note(784,  t + 0.24, 0.13, 'triangle', 0.22);
        this.note(659,  t + 0.37, 0.10, 'triangle', 0.18);
        this.note(784,  t + 0.47, 0.28, 'triangle', 0.25);
        this.note(1047, t + 0.75, 0.40, 'triangle', 0.30);
        break;

      // 🏆 Chiến thắng ≥80% — fanfare lớn
      case 'victory':
        this.note(523,  t,        0.12, 'triangle', 0.24);
        this.note(659,  t + 0.10, 0.12, 'triangle', 0.24);
        this.note(784,  t + 0.20, 0.12, 'triangle', 0.24);
        this.note(1047, t + 0.30, 0.18, 'triangle', 0.28);
        this.note(784,  t + 0.48, 0.10, 'triangle', 0.20);
        this.note(1047, t + 0.58, 0.10, 'triangle', 0.20);
        this.note(1319, t + 0.68, 0.50, 'triangle', 0.32);
        break;

      // 💾 Lưu thành công — ding ngắn
      case 'save_ok':
        this.note(880,  t,       0.07, 'sine', 0.12);
        this.note(1108, t + 0.07, 0.14, 'sine', 0.10);
        break;

      // ⚠️ Cảnh báo / lỗi
      case 'warning':
        this.note(250, t,       0.10, 'sawtooth', 0.16);
        this.note(200, t + 0.12, 0.16, 'sawtooth', 0.14);
        break;
    }
  }

  // ─── Nhạc nền học sinh ──────────────────────────────────────────
  startBGMusic() {
    if (this.bgPlaying || this.muted) return;
    this.bgPlaying = true;
    this.resume().then(() => this._scheduleBG());
  }

  stopBGMusic() {
    this.bgPlaying = false;
    if (this.bgGain && this.ctx) {
      try {
        this.bgGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
      } catch { /* ignore if context is closed */ }
      this.bgGain = null;
    } else {
      this.bgGain = null;
    }
  }

  private _scheduleBG() {
    if (!this.bgPlaying) return;
    const c = this.getCtx();
    if (!this.bgGain) {
      this.bgGain = c.createGain();
      this.bgGain.gain.value = 0.035;
      this.bgGain.connect(c.destination);
    }
    // Giai điệu C major pentatonic nhẹ nhàng
    const melody = [261.63, 293.66, 329.63, 392, 440, 392, 329.63, 293.66];
    let step = 0;
    const tick = () => {
      if (!this.bgPlaying || !this.bgGain) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = melody[step % melody.length];
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.035, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc.connect(g);
      g.connect(this.bgGain!);
      osc.start(now);
      osc.stop(now + 0.48);
      step++;
      setTimeout(tick, 470);
    };
    tick();
  }

  // ─── Mute / Unmute ───────────────────────────────────────────────
  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem('hvtv_muted', this.muted ? '1' : '0');
    if (this.muted) this.stopBGMusic();
    return this.muted;
  }

  get isMuted() { return this.muted; }

  init() {
    this.muted = localStorage.getItem('hvtv_muted') === '1';
  }
}

// ─── Singleton Export ────────────────────────────────────────────
export const soundManager = new SoundManager();

/** Shorthand helpers */
export const playSound = (key: Parameters<SoundManager['play']>[0]) =>
  soundManager.play(key);

// Legacy compat (keep old exports working)
export const playCorrect  = () => soundManager.play('correct');
export const playWrong    = () => soundManager.play('wrong');
export const playComplete = () => soundManager.play('challenge_done');
export const playClick    = () => soundManager.play('select');
export const playBell     = () => soundManager.play('star_gain');
export const setMuted     = (m: boolean) => { if (m !== soundManager.isMuted) soundManager.toggleMute(); };
export const isMuted      = () => soundManager.isMuted;
export const initSound    = () => soundManager.init();
