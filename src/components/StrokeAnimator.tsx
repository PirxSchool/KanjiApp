import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

interface StrokeAnimatorProps {
  kanji: string;
  strokes?: string[];
  size?: number;
}

export const StrokeAnimator: React.FC<StrokeAnimatorProps> = ({
  kanji,
  strokes,
  size = 140
}) => {
  const [key, setKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    setKey(prev => prev + 1);
    setIsPlaying(true);
  }, [kanji]);

  const handleReplay = () => {
    setKey(prev => prev + 1);
    setIsPlaying(true);
  };

  if (!strokes || strokes.length === 0) {
    // Fallback display if specific vector strokes aren't provided
    return (
      <div 
        style={{ width: size, height: size }} 
        className="flex flex-col items-center justify-center bg-rpg-card/60 border border-rpg-border rounded-2xl shadow-inner relative overflow-hidden"
      >
        <span className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">
          {kanji}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        className="relative bg-rpg-card/80 border border-cyan-500/30 rounded-2xl p-4 shadow-[0_0_25px_rgba(6,182,212,0.15)] flex items-center justify-center overflow-hidden group"
        style={{ width: size, height: size }}
      >
        {/* Background grid guidelines */}
        <svg 
          className="absolute inset-0 w-full h-full opacity-15 pointer-events-none stroke-cyan-400"
          viewBox="0 0 100 100"
        >
          <line x1="0" y1="50" x2="100" y2="50" strokeDasharray="4 4" strokeWidth="1" />
          <line x1="50" y1="0" x2="50" y2="100" strokeDasharray="4 4" strokeWidth="1" />
          <rect x="2" y="2" width="96" height="96" fill="none" strokeWidth="1" />
        </svg>

        {/* Animated strokes */}
        <svg key={key} className="w-full h-full" viewBox="0 0 100 100">
          {strokes.map((pathStr, index) => {
            const delay = index * 0.5;
            return (
              <path
                key={index}
                d={pathStr}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 300,
                  strokeDashoffset: isPlaying ? 300 : 0,
                  animation: isPlaying ? `dash 1s cubic-bezier(0.4, 0, 0.2, 1) ${delay}s forwards` : 'none',
                }}
              />
            );
          })}
        </svg>

        {/* Playback Control Overlay */}
        <button
          onClick={handleReplay}
          className="absolute bottom-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500 hover:text-slate-950 transition-all opacity-80 group-hover:opacity-100"
          title="Replay Strokes"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
