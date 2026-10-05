import React from 'react';
import type { UserProgress, JLPTLevel, ViewMode } from '../types/kanji';
import { Trophy, Flame, Layers, Eye, RotateCcw, Filter } from 'lucide-react';

interface HeaderStatsProps {
  progress: UserProgress;
  totalKanjiCount: number;
  masteredCount: number;
  selectedJlpt: JLPTLevel | 'ALL';
  viewMode: ViewMode;
  onSelectJlpt: (jlpt: JLPTLevel | 'ALL') => void;
  onToggleViewMode: (mode: ViewMode) => void;
  onResetProgress: () => void;
}

export const HeaderStats: React.FC<HeaderStatsProps> = ({
  progress,
  totalKanjiCount,
  masteredCount,
  selectedJlpt,
  viewMode,
  onSelectJlpt,
  onToggleViewMode,
  onResetProgress,
}) => {
  const currentLevelXp = progress.xp % 200;
  const xpPercentage = Math.min(100, Math.round((currentLevelXp / 200) * 100));

  const jlptLevels: (JLPTLevel | 'ALL')[] = ['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'];

  return (
    <header className="w-full bg-rpg-panel/90 border-b border-rpg-border backdrop-blur-md px-4 py-3 flex flex-col gap-3 shadow-xl z-20 sticky top-0">
      
      {/* Top Row: User Level, XP Bar, Streak, Stats */}
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto w-full">
        
        {/* Left: App Logo & User Level Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-[0_0_15px_rgba(245,158,11,0.4)]">
            漢
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-white tracking-wide">
                Kanji Quest
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 shadow-sm">
                LVL {progress.level}
              </span>
            </div>

            {/* XP Progress Bar */}
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-24 sm:w-36 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 transition-all duration-500 rounded-full"
                  style={{ width: `${xpPercentage}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-amber-300 font-mono">
                {currentLevelXp}/200 XP
              </span>
            </div>
          </div>
        </div>

        {/* Right Stats: Mastered Count & Streak */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* Mastered Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-amber-300">
            <Trophy className="w-4 h-4 text-amber-400" />
            <div className="flex flex-col text-left leading-tight">
              <span className="text-xs font-bold font-mono">
                {masteredCount}/{totalKanjiCount}
              </span>
              <span className="text-[9px] text-slate-400">Mastered</span>
            </div>
          </div>

          {/* Streak Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-rose-400">
            <Flame className="w-4 h-4 fill-rose-500 text-rose-500 animate-pulse" />
            <div className="flex flex-col text-left leading-tight">
              <span className="text-xs font-bold font-mono">
                {progress.streak}d
              </span>
              <span className="text-[9px] text-slate-400">Streak</span>
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={onResetProgress}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
            title="Reset Progress"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Row: View Mode Switcher & JLPT Level Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 max-w-7xl mx-auto w-full pt-1 border-t border-slate-800/80">
        
        {/* View Mode Toggle: Tree vs Local Focus */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => onToggleViewMode('TREE')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
              viewMode === 'TREE'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Full RPG Tree</span>
          </button>

          <button
            onClick={() => onToggleViewMode('FOCUS')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
              viewMode === 'FOCUS'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Local Focus View</span>
          </button>
        </div>

        {/* JLPT Level Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase mr-1 hidden sm:inline flex items-center gap-1">
            <Filter className="w-3 h-3 text-cyan-400" />
            JLPT:
          </span>
          {jlptLevels.map(level => (
            <button
              key={level}
              onClick={() => onSelectJlpt(level)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedJlpt === level
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md scale-105'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
