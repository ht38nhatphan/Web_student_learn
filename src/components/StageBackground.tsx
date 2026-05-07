import { useMemo } from 'react';
import { motion } from 'motion/react';

export const PRESET_THEMES = [
  { id: 'gradient-stars', name: 'Sao & Gradient',  emoji: '⭐', desc: 'Gradient màu sắc + ngôi sao lấp lánh' },
  { id: 'space',          name: 'Vũ trụ',           emoji: '🚀', desc: 'Nền đen đêm + sao nhấp nháy' },
  { id: 'sky',            name: 'Bầu trời',          emoji: '☁️', desc: 'Xanh da trời + mây trôi' },
  { id: 'water',          name: 'Đại dương',         emoji: '🌊', desc: 'Xanh biển + bong bóng nổi' },
  { id: 'forest',         name: 'Rừng xanh',         emoji: '🌿', desc: 'Xanh lá + lá rơi' },
  { id: 'snow',           name: 'Tuyết rơi',         emoji: '❄️', desc: 'Xanh nhạt + tuyết' },
  { id: 'desert',         name: 'Sa mạc',            emoji: '🏜️', desc: 'Vàng cam + gió cát' },
  { id: 'volcano',        name: 'Núi lửa',           emoji: '🌋', desc: 'Đỏ rực + tàn lửa bay' },
  { id: 'cave',           name: 'Hang động',         emoji: '🪨', desc: 'Tối + đom đóm vàng' },
  { id: 'default',        name: 'Mặc định',          emoji: '🎨', desc: 'Xanh nhẹ + bong bóng' },
] as const;

export type PresetThemeId = typeof PRESET_THEMES[number]['id'];

/** Tạo URL đặc biệt để lưu vào DB thay cho file GIF */
export function makePresetUrl(themeId: string) {
  return `__preset__:${themeId}`;
}

/** Trả về themeId nếu url là preset, null nếu không phải */
export function getPresetTheme(url: string): string | null {
  if (url.startsWith('__preset__:')) return url.replace('__preset__:', '');
  return null;
}

export default function StageBackground({ theme: themeProp, title }: { theme?: string; title?: string }) {
  const lower = (title ?? '').toLowerCase();

  // Xác định theme: từ prop hoặc từ title
  let theme = themeProp ?? 'default';
  if (!themeProp && title) {
    if (lower.includes('hang')) theme = 'cave';
    else if (lower.includes('vũ trụ') || lower.includes('sao')) theme = 'space';
    else if (lower.includes('tuyết') || lower.includes('cánh cụt') || lower.includes('lạnh')) theme = 'snow';
    else if (lower.includes('biển') || lower.includes('suối') || lower.includes('đảo') || lower.includes('nước')) theme = 'water';
    else if (lower.includes('rừng') || lower.includes('cỏ') || lower.includes('trang trại')) theme = 'forest';
    else if (lower.includes('sa mạc') || lower.includes('cát')) theme = 'desert';
    else if (lower.includes('núi lửa')) theme = 'volcano';
    else if (lower.includes('bầu trời') || lower.includes('mây') || lower.includes('gió')) theme = 'sky';
  }

  const particles = useMemo(() => {
    return Array.from({ length: 35 }).map((_, i) => ({
      id: i,
      xStart: Math.random() * 100,
      yStart: Math.random() * 100,
      size: Math.random() * 20 + 5,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 20,
      opacity: Math.random() * 0.5 + 0.3,
      rotate: Math.random() * 360,
    }));
  }, [theme]);

  const bgMap: Record<string, string> = {
    'gradient-stars': 'bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400',
    cave:     'bg-gradient-to-b from-slate-900 via-slate-800 to-zinc-900',
    space:    'bg-gradient-to-b from-indigo-950 via-[rgba(49,46,129,0.9)] to-black',
    snow:     'bg-gradient-to-b from-blue-100 to-sky-300',
    water:    'bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600',
    forest:   'bg-gradient-to-b from-emerald-300 via-green-500 to-green-800',
    desert:   'bg-gradient-to-b from-yellow-300 via-orange-300 to-amber-500',
    volcano:  'bg-gradient-to-b from-red-950 via-red-900 to-orange-950',
    sky:      'bg-gradient-to-b from-sky-300 via-blue-300 to-blue-500',
    default:  'bg-gradient-to-b from-blue-50 to-purple-100',
  };

  const bgClass = bgMap[theme] ?? bgMap.default;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none transition-colors duration-1000 ${bgClass}`}
      style={theme === 'gradient-stars' ? {
        backgroundSize: '400% 400%',
        animation: 'bg-shift 10s ease infinite',
      } : undefined}
    >
      {/* gradient-stars: orbs + emoji stars */}
      {theme === 'gradient-stars' && (<>
        {[
          {w:32,h:32,t:'8%',l:'5%',bg:'bg-white/20',dur:'7s',del:'0s'},
          {w:20,h:20,t:'20%',r:'8%',bg:'bg-yellow-300/30',dur:'5s',del:'1.2s'},
          {w:40,h:40,b:'10%',l:'12%',bg:'bg-pink-400/20',dur:'9s',del:'0.5s'},
          {w:24,h:24,b:'20%',r:'6%',bg:'bg-cyan-300/25',dur:'6s',del:'2s'},
          {w:16,h:16,t:'50%',l:'2%',bg:'bg-green-300/30',dur:'4s',del:'0.8s'},
        ].map((o, i) => (
          <div key={i} className={`playing-orb ${o.bg}`}
            style={{
              width:`${o.w*4}px`, height:`${o.h*4}px`,
              top: o.t, bottom: o.b, left: o.l, right: o.r,
              ['--dur' as any]: o.dur, ['--delay' as any]: o.del,
            }}
          />
        ))}
        {['⭐','🌟','✨','💫','⭐','🌟','✨','💫','⭐','✨'].map((s, i) => (
          <span key={i} className="playing-star select-none"
            style={{
              top: `${10 + (i * 83 % 80)}%`,
              left: `${5 + (i * 97 % 90)}%`,
              fontSize: `${14 + (i % 3) * 8}px`,
              ['--dur' as any]: `${1.5 + (i % 4) * 0.7}s`,
              ['--delay' as any]: `${(i * 0.3) % 2}s`,
            }}
          >{s}</span>
        ))}
        <svg className="playing-cloud absolute w-64 top-4 left-[15%]" viewBox="0 0 200 80" fill="white">
          <ellipse cx="100" cy="50" rx="90" ry="30"/><ellipse cx="70" cy="40" rx="50" ry="25"/><ellipse cx="130" cy="38" rx="45" ry="22"/>
        </svg>
        <svg className="playing-cloud absolute w-48 bottom-8 right-[10%]" viewBox="0 0 200 80" fill="white">
          <ellipse cx="100" cy="50" rx="85" ry="28"/><ellipse cx="65" cy="38" rx="48" ry="24"/><ellipse cx="135" cy="36" rx="42" ry="20"/>
        </svg>
      </>)}

      {theme === 'water' && particles.map(p => (
        <motion.div key={p.id}
          className="absolute border-2 border-white/40 bg-white/10 rounded-full backdrop-blur-[1px]"
          style={{ width: p.size, height: p.size, left: `${p.xStart}vw`, bottom: '-10vh' }}
          animate={{ y: ['0vh', '-120vh'], x: [0, 20, -20, 0] }}
          transition={{ duration: p.duration / 2, repeat: Infinity, delay: -p.delay, ease: 'easeInOut' }}
        />
      ))}

      {theme === 'snow' && particles.map(p => (
        <motion.div key={p.id}
          className="absolute bg-white/90 rounded-full blur-[1px]"
          style={{ width: p.size / 1.5, height: p.size / 1.5, left: `${p.xStart}vw`, top: '-10vh' }}
          animate={{ y: ['0vh', '120vh'], x: [0, 15, -15, 0] }}
          transition={{ duration: p.duration / 1.5, repeat: Infinity, delay: -p.delay, ease: 'linear' }}
        />
      ))}

      {theme === 'cave' && particles.map(p => (
        <motion.div key={p.id}
          className="absolute bg-yellow-400 rounded-full blur-[2px] shadow-[0_0_15px_#fde047]"
          style={{ width: p.size / 2.5, height: p.size / 2.5, left: `${p.xStart}vw`, top: `${p.yStart}vh` }}
          animate={{ y: [0, -40, 40, 0], x: [0, 40, -40, 0], opacity: [p.opacity, p.opacity + 0.6, p.opacity] }}
          transition={{ duration: p.duration, repeat: Infinity, ease: 'easeInOut', delay: -p.delay }}
        />
      ))}

      {theme === 'forest' && particles.map(p => (
        <motion.div key={p.id}
          className="absolute bg-lime-500/40 rounded-tl-full rounded-br-full backdrop-blur-[2px] shadow-[0_0_10px_#a3e635]"
          style={{ width: p.size * 1.5, height: p.size * 1.5, left: `${p.xStart}vw`, top: '-10vh' }}
          animate={{ y: ['0vh', '120vh'], x: [0, 60, -60, 0], rotate: [0, 360] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: -p.delay, ease: 'linear' }}
        />
      ))}

      {theme === 'desert' && particles.map(p => (
        <motion.div key={p.id}
          className="absolute bg-orange-600/30 rounded-full blur-[2px]"
          style={{ width: p.size * 1.2, height: p.size * 1.2, left: '-20vw', top: `${p.yStart}vh` }}
          animate={{ x: ['0vw', '130vw'], y: [0, 15, -15, 0] }}
          transition={{ duration: p.duration / 2, repeat: Infinity, delay: -p.delay, ease: 'linear' }}
        />
      ))}

      {theme === 'volcano' && particles.map(p => (
        <motion.div key={p.id}
          className="absolute bg-orange-500 rounded-sm shadow-[0_0_12px_#f97316]"
          style={{ width: p.size / 3, height: p.size / 3, left: `${p.xStart}vw`, bottom: '-10vh' }}
          animate={{ y: ['0vh', '-120vh'], x: [0, Math.random() * 120 - 60], rotate: [0, 360], opacity: [1, 0] }}
          transition={{ duration: p.duration / 2.5, repeat: Infinity, delay: -p.delay, ease: 'easeOut' }}
        />
      ))}

      {theme === 'space' && particles.map(p => (
        <motion.div key={p.id}
          className="absolute bg-white rounded-full"
          style={{ width: p.size / 6, height: p.size / 6, left: `${p.xStart}vw`, top: `${p.yStart}vh` }}
          animate={{ opacity: [p.opacity * 0.5, 1, p.opacity * 0.5], scale: [1, 1.8, 1] }}
          transition={{ duration: p.duration / 6, repeat: Infinity, delay: -p.delay, ease: 'easeInOut' }}
        />
      ))}

      {theme === 'sky' && particles.slice(0, 8).map(p => (
        <motion.div key={p.id}
          className="absolute bg-white/50 blur-[20px] rounded-full"
          style={{ width: p.size * 15, height: p.size * 8, left: '-40vw', top: `${p.yStart}vh` }}
          animate={{ x: ['0vw', '140vw'] }}
          transition={{ duration: p.duration * 2.5, repeat: Infinity, delay: -p.delay, ease: 'linear' }}
        />
      ))}

      {theme === 'default' && particles.slice(0, 15).map(p => (
        <motion.div key={p.id}
          className="absolute bg-blue-400/20 rounded-full blur-[24px]"
          style={{ width: p.size * 6, height: p.size * 6, left: `${p.xStart}vw`, top: `${p.yStart}vh` }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3], x: [0, 20, -20, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: -p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
