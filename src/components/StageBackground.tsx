import { useMemo } from 'react';
import { motion } from 'motion/react';

export default function StageBackground({ title }: { title: string }) {
  const lower = title.toLowerCase();

  const isCave = lower.includes('hang');
  const isSpace = lower.includes('vũ trụ') || lower.includes('sao');
  const isSnow = lower.includes('tuyết') || lower.includes('cánh cụt') || lower.includes('lạnh');
  const isWater = lower.includes('biển') || lower.includes('suối') || lower.includes('đảo') || lower.includes('nước');
  const isForest = lower.includes('rừng') || lower.includes('cỏ') || lower.includes('trang trại');
  const isDesert = lower.includes('sa mạc') || lower.includes('cát');
  const isVolcano = lower.includes('núi lửa');
  const isSky = lower.includes('bầu trời') || lower.includes('mây') || lower.includes('gió');

  let theme = 'default';
  if (isCave) theme = 'cave';
  else if (isSpace) theme = 'space';
  else if (isSnow) theme = 'snow';
  else if (isWater) theme = 'water';
  else if (isForest) theme = 'forest';
  else if (isDesert) theme = 'desert';
  else if (isVolcano) theme = 'volcano';
  else if (isSky) theme = 'sky';

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
    cave: "bg-gradient-to-b from-slate-900 via-slate-800 to-zinc-900",
    space: "bg-gradient-to-b from-indigo-950 via-[rgba(49,46,129,0.9)] to-black",
    snow: "bg-gradient-to-b from-blue-100 to-sky-300",
    water: "bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600",
    forest: "bg-gradient-to-b from-emerald-300 via-green-500 to-green-800",
    desert: "bg-gradient-to-b from-yellow-300 via-orange-300 to-amber-500",
    volcano: "bg-gradient-to-b from-red-950 via-red-900 to-orange-950",
    sky: "bg-gradient-to-b from-sky-300 via-blue-300 to-blue-500",
    default: "bg-gradient-to-b from-blue-50 to-purple-100"
  };

  const bgClass = bgMap[theme];

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none transition-colors duration-1000 ${bgClass}`}>
      {theme === 'water' && particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute border-2 border-white/40 bg-white/10 rounded-full backdrop-blur-[1px]"
          style={{ width: p.size, height: p.size, left: `${p.xStart}vw`, bottom: '-10vh' }}
          animate={{
            y: ['0vh', '-120vh'],
            x: [0, 20, -20, 0]
          }}
          transition={{ duration: p.duration / 2, repeat: Infinity, delay: -p.delay, ease: 'easeInOut' }}
        />
      ))}

      {theme === 'snow' && particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute bg-white/90 rounded-full blur-[1px]"
          style={{ width: p.size / 1.5, height: p.size / 1.5, left: `${p.xStart}vw`, top: '-10vh' }}
          animate={{
            y: ['0vh', '120vh'],
            x: [0, 15, -15, 0]
          }}
          transition={{ duration: p.duration / 1.5, repeat: Infinity, delay: -p.delay, ease: 'linear' }}
        />
      ))}

      {theme === 'cave' && particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute bg-yellow-400 rounded-full blur-[2px] shadow-[0_0_15px_#fde047]"
          style={{ width: p.size / 2.5, height: p.size / 2.5, left: `${p.xStart}vw`, top: `${p.yStart}vh` }}
          animate={{
            y: [0, -40, 40, 0],
            x: [0, 40, -40, 0],
            opacity: [p.opacity, p.opacity + 0.6, p.opacity]
          }}
          transition={{ duration: p.duration, repeat: Infinity, ease: 'easeInOut', delay: -p.delay }}
        />
      ))}

      {theme === 'forest' && particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute bg-lime-500/40 rounded-tl-full rounded-br-full backdrop-blur-[2px] shadow-[0_0_10px_#a3e635]"
          style={{ width: p.size * 1.5, height: p.size * 1.5, left: `${p.xStart}vw`, top: '-10vh' }}
          animate={{
            y: ['0vh', '120vh'],
            x: [0, 60, -60, 0],
            rotate: [0, 360]
          }}
          transition={{ duration: p.duration, repeat: Infinity, delay: -p.delay, ease: 'linear' }}
        />
      ))}

      {theme === 'desert' && particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute bg-orange-600/30 rounded-full blur-[2px]"
          style={{ width: p.size * 1.2, height: p.size * 1.2, left: '-20vw', top: `${p.yStart}vh` }}
          animate={{
            x: ['0vw', '130vw'],
            y: [0, 15, -15, 0]
          }}
          transition={{ duration: p.duration / 2, repeat: Infinity, delay: -p.delay, ease: 'linear' }}
        />
      ))}

      {theme === 'volcano' && particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute bg-orange-500 rounded-sm shadow-[0_0_12px_#f97316]"
          style={{ width: p.size / 3, height: p.size / 3, left: `${p.xStart}vw`, bottom: '-10vh' }}
          animate={{
            y: ['0vh', '-120vh'],
            x: [0, Math.random() * 120 - 60],
            rotate: [0, 360],
            opacity: [1, 0]
          }}
          transition={{ duration: p.duration / 2.5, repeat: Infinity, delay: -p.delay, ease: 'easeOut' }}
        />
      ))}

      {theme === 'space' && particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute bg-white rounded-full"
          style={{ width: p.size / 6, height: p.size / 6, left: `${p.xStart}vw`, top: `${p.yStart}vh` }}
          animate={{
            opacity: [p.opacity * 0.5, 1, p.opacity * 0.5],
            scale: [1, 1.8, 1]
          }}
          transition={{ duration: p.duration / 6, repeat: Infinity, delay: -p.delay, ease: 'easeInOut' }}
        />
      ))}

      {theme === 'sky' && particles.slice(0, 8).map(p => (
        <motion.div
          key={p.id}
          className="absolute bg-white/50 blur-[20px] rounded-full"
          style={{ width: p.size * 15, height: p.size * 8, left: '-40vw', top: `${p.yStart}vh` }}
          animate={{
            x: ['0vw', '140vw']
          }}
          transition={{ duration: p.duration * 2.5, repeat: Infinity, delay: -p.delay, ease: 'linear' }}
        />
      ))}

      {theme === 'default' && particles.slice(0, 15).map(p => (
        <motion.div
          key={p.id}
          className="absolute bg-blue-400/20 rounded-full blur-[24px]"
          style={{ width: p.size * 6, height: p.size * 6, left: `${p.xStart}vw`, top: `${p.yStart}vh` }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.7, 0.3],
            x: [0, 20, -20, 0]
          }}
          transition={{ duration: p.duration, repeat: Infinity, delay: -p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
