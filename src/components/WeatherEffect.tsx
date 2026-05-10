import React, { useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type WeatherType =
  | 'snow' | 'rain' | 'hail' | 'leaves' | 'petals' | 'stars'
  | 'bubbles' | 'hearts' | 'money' | 'custom' | 'none'
  | 'fireflies' | 'confetti' | 'sakura' | 'galaxy' | 'fire'
  | 'aurora' | 'matrix' | 'balloons' | 'feathers' | 'lightning' | 'dice';

export type CustomStyle = 
  | 'fall' | 'float' | 'spin' | 'rain' 
  | 'firefly' | 'confetti' | 'sakura' | 'galaxy' 
  | 'fire' | 'balloon';

interface Props {
  type: WeatherType;
  enabled?: boolean;
  mode?: 'overlay' | 'portal';
  customEmojis?: string[];
  customStyle?: CustomStyle;
  /** Speed multiplier (default: 1) */
  speed?: number;
  /** Particle count multiplier (default: 1) */
  density?: number;
}

interface Particle {
  id: number;
  x: number; y?: number;
  size: number;
  height?: number;
  duration: number;
  delay: number;
  opacity: number;
  emoji?: string;
  char?: string;
  r0?: number; r1?: number;
  tx?: number; ty?: number;
  swing?: number;
  hue?: number;
  w?: number; h?: number;
}

// ─── Keyframes ───────────────────────────────────────────────────────────────

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
      100% { transform: translateY(105vh); opacity: 0.1; }
    }
    @keyframes wf-hail {
      0%   { transform: translateY(-20px);             opacity: 1; }
      80%  { transform: translateY(88vh);              opacity: 1; }
      88%  { transform: translateY(86vh) scaleY(0.4);             }
      100% { transform: translateY(105vh);             opacity: 0; }
    }
    @keyframes wf-leaf {
      0%   { transform: translateY(-20px) rotate(var(--r0)) translateX(0px);   opacity: 1; }
      35%  { transform: translateY(35vh)  rotate(var(--r1)) translateX(28px);  }
      70%  { transform: translateY(70vh)  rotate(var(--r0)) translateX(-18px); }
      100% { transform: translateY(108vh) rotate(var(--r1)) translateX(8px);   opacity: 0; }
    }
    @keyframes wf-bubble {
      0%   { transform: translateY(0px) translateX(0px) scale(0.8); opacity: 0; }
      20%  { opacity: var(--max-op, 0.6); }
      50%  { transform: translateY(-50vh) translateX(var(--tx)) scale(1.1); }
      100% { transform: translateY(-110vh) translateX(calc(var(--tx) * -1)) scale(0.9); opacity: 0; }
    }
    @keyframes wf-float-up {
      0%   { transform: translateY(0px) translateX(0px) rotate(var(--r0)); opacity: 1; }
      100% { transform: translateY(-110vh) translateX(var(--tx)) rotate(var(--r1)); opacity: 0; }
    }
    @keyframes wf-spin {
      0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(108vh) rotate(720deg); opacity: 0; }
    }
    @keyframes wf-firefly {
      0%   { transform: translate(0px, 0px); opacity: 0; }
      25%  { opacity: 1; }
      50%  { transform: translate(var(--tx), var(--ty)); opacity: 0.3; }
      75%  { opacity: 1; }
      100% { transform: translate(0px, 0px); opacity: 0; }
    }
    @keyframes wf-confetti {
      0%   { transform: translateY(-20px) rotate(var(--r0)) translateX(0px); opacity: 1; }
      50%  { transform: translateY(50vh) rotate(calc(var(--r0) * 1.5)) translateX(var(--tx)); }
      100% { transform: translateY(108vh) rotate(var(--r1)) translateX(calc(var(--tx) * -1)); opacity: 0; }
    }
    @keyframes wf-sakura {
      0%   { transform: translateY(-28px) rotate(var(--r0)) translateX(0px);          opacity: 1; }
      25%  { transform: translateY(25vh)  rotate(var(--r1)) translateX(var(--swing)); }
      50%  { transform: translateY(50vh)  rotate(var(--r0)) translateX(calc(var(--swing) * -0.5)); }
      75%  { transform: translateY(75vh)  rotate(var(--r1)) translateX(var(--swing)); }
      100% { transform: translateY(108vh) rotate(var(--r0)) translateX(0px);          opacity: 0; }
    }
    @keyframes wf-galaxy {
      0%   { transform: translate(0px, 0px) rotate(0deg) scale(0.5); opacity: 0; }
      30%  { opacity: 1; }
      70%  { opacity: 0.6; }
      100% { transform: translate(var(--tx), var(--ty)) rotate(var(--r0)) scale(1.2); opacity: 0; }
    }
    @keyframes wf-fire {
      0%   { transform: translateY(0px) translateX(0px) scale(1);    opacity: 1; }
      100% { transform: translateY(-90vh) translateX(var(--tx)) scale(0.3); opacity: 0; }
    }
    @keyframes wf-aurora {
      0%   { transform: translateX(0px) scaleX(1);               opacity: 0; }
      30%  { opacity: var(--max-op, 0.2); }
      60%  { transform: translateX(var(--tx)) scaleX(1.5); }
      100% { transform: translateX(0px) scaleX(0.8);             opacity: 0; }
    }
    @keyframes wf-balloon {
      0%   { transform: translateY(0px) translateX(0px) rotate(var(--r0)); opacity: 1; }
      50%  { transform: translateY(-50vh) translateX(var(--tx)) rotate(var(--r1)); }
      100% { transform: translateY(-110vh) translateX(calc(var(--tx) * -0.5)) rotate(var(--r0)); opacity: 0; }
    }
    @keyframes wf-lightning {
      0%   { transform: translateY(-32px) scale(1);   opacity: 0; }
      5%   { opacity: 1; }
      15%  { transform: translateY(30vh) scale(1.5);  opacity: 0.9; }
      30%  { opacity: 0; transform: translateY(40vh); }
      100% { transform: translateY(108vh);             opacity: 0; }
    }
  `;
  document.head.appendChild(s);
}

// ─── Particle factories ───────────────────────────────────────────────────────

type ParticleDef = {
  count: number;
  make: (i: number, speed: number) => Particle;
  render: (p: Particle) => { style: React.CSSProperties; content?: React.ReactNode };
};

function rand(min: number, max: number) { return min + Math.random() * (max - min); }
function pick<T>(arr: T[], i: number): T { return arr[i % arr.length]; }

const KATAKANA = Array.from({ length: 96 }, (_, i) => String.fromCharCode(0x30A0 + i));

function buildDefs(speed: number, density: number): Record<string, ParticleDef> {
  const s = speed; // shorthand

  return {
    snow: {
      count: Math.round(50 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, size: rand(3, 10),
        duration: rand(5, 10) / s, delay: -Math.random() * 10, opacity: rand(0.6, 1),
      }),
      render: (p) => ({
        style: {
          top: '-20px', left: `${p.x}%`, width: p.size, height: p.size,
          borderRadius: '50%', background: 'white',
          boxShadow: '0 0 5px rgba(200,230,255,0.9)',
          animationName: 'wf-snow', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'linear', opacity: p.opacity,
        },
      }),
    },

    rain: {
      count: Math.round(80 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, size: 2, height: rand(14, 26),
        duration: rand(0.4, 0.8) / s, delay: -Math.random() * 5, opacity: rand(0.3, 0.65),
      }),
      render: (p) => ({
        style: {
          top: '-20px', left: `${p.x}%`, width: 1.5, height: p.height,
          background: 'linear-gradient(to bottom, rgba(147,197,253,0), rgba(147,197,253,0.85))',
          borderRadius: 1, transform: 'skewX(-12deg)',
          animationName: 'wf-rain', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'linear', opacity: p.opacity,
        },
      }),
    },

    hail: {
      count: Math.round(35 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, size: rand(4, 9),
        duration: rand(0.6, 1.1) / s, delay: -Math.random() * 5, opacity: rand(0.7, 1),
      }),
      render: (p) => ({
        style: {
          top: '-20px', left: `${p.x}%`, width: p.size, height: p.size,
          borderRadius: '50%',
          background: 'linear-gradient(135deg,#e0f2fe,#bae6fd)',
          border: '1px solid rgba(147,197,253,0.7)',
          animationName: 'wf-hail', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'linear', opacity: p.opacity,
        },
      }),
    },

    leaves: {
      count: Math.round(25 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, size: rand(14, 24),
        emoji: pick(['🍂', '🍁', '🍃'], i),
        duration: rand(5, 11) / s, delay: -Math.random() * 10, opacity: 0.9,
        r0: Math.random() * 360, r1: Math.random() * 360 + 180,
      }),
      render: (p) => ({
        style: {
          top: '-24px', left: `${p.x}%`, fontSize: p.size,
          '--r0': `${p.r0}deg`, '--r1': `${p.r1}deg`,
          animationName: 'wf-leaf', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        } as React.CSSProperties,
        content: p.emoji,
      }),
    },

    petals: {
      count: Math.round(30 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, size: rand(12, 22),
        emoji: pick(['🌸', '🌺', '🌼', '💮'], i),
        duration: rand(6, 11) / s, delay: -Math.random() * 10, opacity: 0.9,
        r0: Math.random() * 360, r1: Math.random() * 360 + 180,
      }),
      render: (p) => ({
        style: {
          top: '-24px', left: `${p.x}%`, fontSize: p.size,
          '--r0': `${p.r0}deg`, '--r1': `${p.r1}deg`,
          animationName: 'wf-leaf', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        } as React.CSSProperties,
        content: p.emoji,
      }),
    },

    stars: {
      count: Math.round(30 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, size: rand(14, 26),
        emoji: pick(['✨', '🌟', '⭐', '💫'], i),
        duration: rand(4, 8) / s, delay: -Math.random() * 8, opacity: 0.9,
      }),
      render: (p) => ({
        style: {
          top: '-24px', left: `${p.x}%`, fontSize: p.size,
          animationName: 'wf-spin', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'linear',
        } as React.CSSProperties,
        content: p.emoji,
      }),
    },

    bubbles: {
      count: Math.round(40 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, size: rand(10, 26),
        duration: rand(4, 10) / s, delay: -Math.random() * 8, opacity: rand(0.4, 0.8),
        tx: (Math.random() - 0.5) * 50,
      }),
      render: (p) => ({
        style: {
          bottom: '-24px', top: 'auto', left: `${p.x}%`, fontSize: p.size,
          '--tx': `${p.tx}px`, '--max-op': p.opacity,
          animationName: 'wf-bubble', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        } as React.CSSProperties,
        content: '🫧',
      }),
    },

    hearts: {
      count: Math.round(30 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, size: rand(14, 26),
        emoji: pick(['❤️', '💖', '💕', '💘', '💗'], i),
        duration: rand(5, 10) / s, delay: -Math.random() * 8, opacity: 0.9,
        r0: rand(-15, 15), r1: rand(-30, 30), tx: (Math.random() - 0.5) * 60,
      }),
      render: (p) => ({
        style: {
          bottom: '-24px', top: 'auto', left: `${p.x}%`, fontSize: p.size,
          '--tx': `${p.tx}px`, '--r0': `${p.r0}deg`, '--r1': `${p.r1}deg`,
          animationName: 'wf-float-up', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        } as React.CSSProperties,
        content: p.emoji,
      }),
    },

    money: {
      count: Math.round(25 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, size: rand(14, 26),
        emoji: pick(['💸', '💵', '💰', '🤑', '🪙'], i),
        duration: rand(5, 10) / s, delay: -Math.random() * 10, opacity: 0.9,
        r0: Math.random() * 360, r1: Math.random() * 360 + 180,
      }),
      render: (p) => ({
        style: {
          top: '-24px', left: `${p.x}%`, fontSize: p.size,
          '--r0': `${p.r0}deg`, '--r1': `${p.r1}deg`,
          animationName: 'wf-leaf', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        } as React.CSSProperties,
        content: p.emoji,
      }),
    },

    // ── NEW EFFECTS ──────────────────────────────────────────────────────────

    fireflies: {
      count: Math.round(35 * density),
      make: (i) => ({
        id: i, x: rand(5, 95), y: rand(10, 90), size: rand(3, 7),
        duration: rand(2, 6) / s, delay: -Math.random() * 6, opacity: 0.9,
        tx: (Math.random() - 0.5) * 80, ty: (Math.random() - 0.5) * 80,
        hue: rand(50, 110),
      }),
      render: (p) => ({
        style: {
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: '50%',
          background: `hsl(${p.hue},100%,65%)`,
          boxShadow: `0 0 ${p.size * 3}px hsl(${p.hue},100%,55%)`,
          '--tx': `${p.tx}px`, '--ty': `${p.ty}px`,
          animationName: 'wf-firefly', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        } as React.CSSProperties,
      }),
    },

    confetti: {
      count: Math.round(50 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, w: rand(6, 14), h: rand(3, 7),
        size: 0,
        duration: rand(3, 8) / s, delay: -Math.random() * 10, opacity: 0.9,
        r0: Math.random() * 360, r1: Math.random() * 900,
        tx: (Math.random() - 0.5) * 60, hue: Math.random() * 360,
      }),
      render: (p) => ({
        style: {
          top: '-20px', left: `${p.x}%`, width: p.w, height: p.h,
          borderRadius: 2, background: `hsl(${p.hue},85%,60%)`,
          '--r0': `${p.r0}deg`, '--r1': `${p.r1}deg`, '--tx': `${p.tx}px`,
          animationName: 'wf-confetti', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in',
        } as React.CSSProperties,
      }),
    },

    sakura: {
      count: Math.round(30 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, size: rand(16, 30),
        emoji: pick(['🌸', '🌺', '🌼', '🌷'], i),
        duration: rand(7, 13) / s, delay: -Math.random() * 12, opacity: 0.9,
        r0: Math.random() * 360, r1: Math.random() * 540,
        swing: (Math.random() - 0.5) * 80,
      }),
      render: (p) => ({
        style: {
          top: '-28px', left: `${p.x}%`, fontSize: p.size,
          '--r0': `${p.r0}deg`, '--r1': `${p.r1}deg`, '--swing': `${p.swing}px`,
          animationName: 'wf-sakura', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        } as React.CSSProperties,
        content: p.emoji,
      }),
    },

    galaxy: {
      count: Math.round(40 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, y: Math.random() * 100, size: rand(10, 24),
        emoji: pick(['🌟', '⭐', '💫', '✨', '🌠'], i),
        duration: rand(8, 16) / s, delay: -Math.random() * 12, opacity: 0.9,
        tx: (Math.random() - 0.5) * 100, ty: (Math.random() - 0.5) * 100,
        r0: Math.random() * 720,
      }),
      render: (p) => ({
        style: {
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size,
          '--tx': `${p.tx}px`, '--ty': `${p.ty}px`, '--r0': `${p.r0}deg`,
          animationName: 'wf-galaxy', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        } as React.CSSProperties,
        content: p.emoji,
      }),
    },

    fire: {
      count: Math.round(30 * density),
      make: (i) => ({
        id: i, x: rand(30, 70), size: rand(14, 30),
        emoji: pick(['🔥', '🌋', '✨'], i),
        duration: rand(1, 3) / s, delay: -Math.random() * 3, opacity: rand(0.6, 1),
        tx: (Math.random() - 0.5) * 40,
      }),
      render: (p) => ({
        style: {
          bottom: '-28px', top: 'auto', left: `${p.x}%`, fontSize: p.size,
          opacity: p.opacity, '--tx': `${p.tx}px`,
          animationName: 'wf-fire', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-out',
        } as React.CSSProperties,
        content: p.emoji,
      }),
    },

    aurora: {
      count: Math.round(20 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, y: rand(5, 75), w: rand(40, 120), h: rand(8, 20),
        size: 0,
        duration: rand(3, 7) / s, delay: -Math.random() * 6, opacity: rand(0.12, 0.3),
        hue: rand(120, 300), tx: (Math.random() - 0.5) * 60,
      }),
      render: (p) => ({
        style: {
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: p.w, height: p.h, borderRadius: '50%',
          background: `hsl(${p.hue},80%,65%)`, filter: 'blur(8px)',
          opacity: p.opacity,
          '--tx': `${p.tx}px`, '--max-op': p.opacity,
          animationName: 'wf-aurora', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        } as React.CSSProperties,
      }),
    },

    matrix: {
      count: Math.round(30 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, size: rand(10, 16),
        char: KATAKANA[Math.floor(Math.random() * KATAKANA.length)],
        duration: rand(1, 3) / s, delay: -Math.random() * 8, opacity: rand(0.4, 1),
      }),
      render: (p) => ({
        style: {
          top: '-20px', left: `${p.x}%`, fontSize: p.size, lineHeight: 1,
          color: '#00ff41', fontFamily: 'monospace', opacity: p.opacity,
          animationName: 'wf-rain', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'linear',
        } as React.CSSProperties,
        content: p.char,
      }),
    },

    balloons: {
      count: Math.round(20 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, size: rand(20, 36),
        emoji: pick(['🎈', '🎀', '🎉', '🥳'], i),
        duration: rand(4, 9) / s, delay: -Math.random() * 8, opacity: 0.9,
        tx: (Math.random() - 0.5) * 50, r0: rand(-10, 10),
      }),
      render: (p) => ({
        style: {
          bottom: '-32px', top: 'auto', left: `${p.x}%`, fontSize: p.size,
          '--tx': `${p.tx}px`, '--r0': `${p.r0}deg`, '--r1': `${-(p.r0 ?? 0) * 1.5}deg`,
          animationName: 'wf-balloon', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        } as React.CSSProperties,
        content: p.emoji,
      }),
    },

    feathers: {
      count: Math.round(20 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, size: rand(16, 28),
        duration: rand(8, 14) / s, delay: -Math.random() * 12, opacity: 0.9,
        r0: Math.random() * 360, r1: Math.random() * 360 + 180,
        swing: (Math.random() - 0.5) * 100,
      }),
      render: (p) => ({
        style: {
          top: '-28px', left: `${p.x}%`, fontSize: p.size,
          '--r0': `${p.r0}deg`, '--r1': `${p.r1}deg`, '--swing': `${p.swing}px`,
          animationName: 'wf-sakura', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        } as React.CSSProperties,
        content: '🪶',
      }),
    },

    lightning: {
      count: Math.round(8 * density),
      make: (i) => ({
        id: i, x: rand(10, 90), size: rand(24, 44),
        emoji: pick(['⚡', '🌩️', '💥'], i),
        duration: rand(0.5, 1.3) / s, delay: -Math.random() * 5, opacity: 1,
      }),
      render: (p) => ({
        style: {
          top: '-32px', left: `${p.x}%`, fontSize: p.size,
          animationName: 'wf-lightning', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in',
        } as React.CSSProperties,
        content: p.emoji,
      }),
    },

    dice: {
      count: Math.round(20 * density),
      make: (i) => ({
        id: i, x: Math.random() * 100, size: rand(16, 28),
        emoji: pick(['🎲', '🎯', '🃏', '🀄'], i),
        duration: rand(3, 7) / s, delay: -Math.random() * 8, opacity: 0.9,
      }),
      render: (p) => ({
        style: {
          top: '-28px', left: `${p.x}%`, fontSize: p.size,
          animationName: 'wf-spin', animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`, animationIterationCount: 'infinite',
          animationTimingFunction: 'linear',
        } as React.CSSProperties,
        content: p.emoji,
      }),
    },

    // Custom — maps to style via customStyle
    custom: {
      count: Math.round(30 * density),
      make: (i) => ({ id: i, x: Math.random() * 100, size: 16, duration: 5, delay: 0, opacity: 1 }),
      render: () => ({ style: {} }),
    },
    none: {
      count: 0,
      make: (i) => ({ id: i, x: 0, size: 0, duration: 1, delay: 0, opacity: 0 }),
      render: () => ({ style: {} }),
    },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WeatherEffect({
  type,
  enabled = true,
  mode = 'overlay',
  customEmojis,
  customStyle,
  speed = 1,
  density = 1,
}: Props) {
  useEffect(() => { ensureKeyframes(); }, []);

  const particles = useMemo(() => {
    const defs = buildDefs(speed, density);

    // Handle 'custom' type by delegating to an appropriate style
    let resolvedType: WeatherType = type;
    if (type === 'custom') {
      if (customStyle === 'float') resolvedType = 'hearts';
      else if (customStyle === 'spin') resolvedType = 'stars';
      else if (customStyle === 'rain') resolvedType = 'rain';
      else if (customStyle === 'firefly') resolvedType = 'fireflies';
      else if (customStyle === 'confetti') resolvedType = 'confetti';
      else if (customStyle === 'sakura') resolvedType = 'sakura';
      else if (customStyle === 'galaxy') resolvedType = 'galaxy';
      else if (customStyle === 'fire') resolvedType = 'fire';
      else if (customStyle === 'balloon') resolvedType = 'balloons';
      else resolvedType = 'leaves';
    }

    const def = defs[resolvedType] ?? defs.none;
    return Array.from({ length: def.count }, (_, i) => {
      const p = def.make(i, speed);
      // Override emoji for custom type
      if (type === 'custom' && customEmojis?.length) {
        p.emoji = customEmojis[i % customEmojis.length];
      }
      return { p, render: def.render };
    });
  }, [type, speed, density, customEmojis, customStyle]);

  if (!enabled || type === 'none') return null;

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    userSelect: 'none',
    willChange: 'transform, opacity',
    lineHeight: 1,
  };

  const content = (
    <div
      className={
        mode === 'portal'
          ? 'fixed inset-0 pointer-events-none z-[9999] overflow-hidden'
          : 'absolute inset-0 pointer-events-none z-[5] overflow-hidden'
      }
      aria-hidden="true"
    >
      {particles.map(({ p, render }) => {
        const { style, content: inner } = render(p);
        return (
          <div key={p.id} style={{ ...baseStyle, ...style }}>
            {inner ?? null}
          </div>
        );
      })}
    </div>
  );

  if (mode === 'portal') return createPortal(content, document.body);
  return content;
}
