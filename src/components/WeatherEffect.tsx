import React, { useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type WeatherType = 'snow' | 'rain' | 'hail' | 'leaves' | 'petals' | 'none';

interface Props {
  type: WeatherType;
  enabled?: boolean;
  /** 'overlay': absolute (dùng trong container), 'portal': fixed toàn màn hình */
  mode?: 'overlay' | 'portal';
}

interface Particle {
  id: number; x: number; size: number; height?: number;
  duration: number; delay: number; opacity: number;
  emoji?: string; r0?: number; r1?: number;
}

// Inject keyframes 1 lần duy nhất vào <head>
function ensureKeyframes() {
  if (document.getElementById('weather-kf')) return;
  const s = document.createElement('style');
  s.id = 'weather-kf';
  s.textContent = `
    @keyframes wf-snow {
      0%   { transform: translateY(-20px) translateX(0px) rotate(0deg);   opacity: 1; }
      50%  { transform: translateY(45vh) translateX(18px) rotate(180deg); }
      100% { transform: translateY(105vh) translateX(-12px) rotate(360deg); opacity: 0; }
    }
    @keyframes wf-rain {
      0%   { transform: translateY(-20px); opacity: 0.8; }
      100% { transform: translateY(105vh); opacity: 0.2; }
    }
    @keyframes wf-hail {
      0%   { transform: translateY(-20px);             opacity: 1; }
      80%  { transform: translateY(88vh);              opacity: 1; }
      88%  { transform: translateY(86vh) scaleY(0.4);             }
      100% { transform: translateY(105vh);             opacity: 0; }
    }
    @keyframes wf-leaf {
      0%   { transform: translateY(-20px)  rotate(var(--r0)) translateX(0px);   opacity: 1; }
      35%  { transform: translateY(35vh)   rotate(var(--r1)) translateX(28px);  }
      70%  { transform: translateY(70vh)   rotate(var(--r0)) translateX(-18px); }
      100% { transform: translateY(108vh)  rotate(var(--r1)) translateX(8px);   opacity: 0; }
    }
    @keyframes wf-petal {
      0%   { transform: translateY(-20px)  rotate(var(--r0)) scale(1);   opacity: 1; }
      50%  { transform: translateY(50vh)   rotate(var(--r1)) scale(1.1) translateX(22px); }
      100% { transform: translateY(108vh)  rotate(var(--r0)) scale(0.8) translateX(-14px); opacity: 0; }
    }
  `;
  document.head.appendChild(s);
}

function makeParticles(type: WeatherType): Particle[] {
  const n = { snow: 50, rain: 80, hail: 35, leaves: 20, petals: 25, none: 0 }[type] ?? 0;
  const LEAF_EMOJI = ['🍂','🍁','🍃','🍂','🍁'];
  const PETAL_EMOJI = ['🌸','🌺','🌼','🌸','💮'];
  return Array.from({ length: n }, (_, i) => {
    const x = Math.random() * 100;
    const delay = -(Math.random() * 10);
    if (type === 'snow') return { id: i, x, delay, size: 4+Math.random()*8, duration: 5+Math.random()*5, opacity: 0.6+Math.random()*0.4 };
    if (type === 'rain') return { id: i, x, delay, size: 2, height: 16+Math.random()*12, duration: 0.5+Math.random()*0.4, opacity: 0.35+Math.random()*0.3 };
    if (type === 'hail') return { id: i, x, delay, size: 4+Math.random()*5, duration: 0.7+Math.random()*0.5, opacity: 0.7+Math.random()*0.3 };
    if (type === 'leaves') return { id: i, x, delay, size: 18+Math.random()*10, duration: 5+Math.random()*6, opacity: 0.9, emoji: LEAF_EMOJI[i%5], r0: Math.random()*360, r1: Math.random()*360+180 };
    if (type === 'petals') return { id: i, x, delay, size: 16+Math.random()*8, duration: 6+Math.random()*5, opacity: 0.85, emoji: PETAL_EMOJI[i%5], r0: 0, r1: Math.random()*360 };
    return { id: i, x, delay, size: 6, duration: 3, opacity: 0.7 };
  });
}

function particleStyle(p: Particle, type: WeatherType): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    top: '-24px',
    left: `${p.x}%`,
    opacity: p.opacity,
    animationDuration: `${p.duration}s`,
    animationDelay: `${p.delay}s`,
    animationIterationCount: 'infinite',
    animationTimingFunction: (type === 'rain' || type === 'hail') ? 'linear' : 'ease-in-out',
    pointerEvents: 'none',
    userSelect: 'none',
    willChange: 'transform, opacity',
  };
  if (type === 'snow') return { ...base, width: p.size, height: p.size, borderRadius: '50%', background: 'white', boxShadow: '0 0 5px rgba(255,255,255,0.9)', animationName: 'wf-snow' };
  if (type === 'rain') return { ...base, width: 2, height: p.height ?? 20, background: 'linear-gradient(to bottom, rgba(147,197,253,0), rgba(147,197,253,0.85))', borderRadius: 1, transform: 'skewX(-12deg)', animationName: 'wf-rain' };
  if (type === 'hail') return { ...base, width: p.size, height: p.size, borderRadius: '50%', background: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', border: '1px solid rgba(147,197,253,0.8)', animationName: 'wf-hail' };
  if (type === 'leaves' || type === 'petals') return {
    ...base,
    fontSize: p.size,
    lineHeight: 1,
    animationName: type === 'leaves' ? 'wf-leaf' : 'wf-petal',
    // CSS custom properties for rotation
    ['--r0' as string]: `${p.r0 ?? 0}deg`,
    ['--r1' as string]: `${p.r1 ?? 180}deg`,
  } as React.CSSProperties;
  return base;
}

export default function WeatherEffect({ type, enabled = true, mode = 'overlay' }: Props) {
  // Inject keyframes once
  useEffect(() => { ensureKeyframes(); }, []);

  // Stable particle list (không tạo lại mỗi render)
  const particles = useMemo(() => makeParticles(type), [type]);

  if (!enabled || type === 'none') return null;

  const content = (
    <div
      className={mode === 'portal' ? 'fixed inset-0 pointer-events-none z-[9999] overflow-hidden' : 'absolute inset-0 pointer-events-none z-[5] overflow-hidden'}
      aria-hidden="true"
    >
      {particles.map(p => (
        <div key={p.id} style={particleStyle(p, type)}>
          {(type === 'leaves' || type === 'petals') ? p.emoji : null}
        </div>
      ))}
    </div>
  );

  // Portal mode: render vào document.body, tránh bị clip bởi overflow:hidden của parent
  if (mode === 'portal') {
    return createPortal(content, document.body);
  }
  return content;
}
