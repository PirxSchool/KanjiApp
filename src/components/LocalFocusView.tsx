import React from 'react';
import type { KanjiNodeData, NodeStatus } from '../types/kanji';
import { ArrowUp, ArrowDown, Sparkles, Check, Lock, ChevronRight } from 'lucide-react';

interface LocalFocusViewProps {
  focusedNode: KanjiNodeData;
  allNodes: KanjiNodeData[];
  getNodeStatus: (node: KanjiNodeData) => NodeStatus;
  onSelectNode: (node: KanjiNodeData) => void;
  onToggleMastery: (id: string) => void;
}

export const LocalFocusView: React.FC<LocalFocusViewProps> = ({
  focusedNode,
  allNodes,
  getNodeStatus,
  onSelectNode,
  onToggleMastery,
}) => {
  const currentStatus = getNodeStatus(focusedNode);

  // Parent Prerequisites
  const parents = focusedNode.parents
    .map(pId => allNodes.find(n => n.id === pId))
    .filter((n): n is KanjiNodeData => n !== undefined);

  // Immediate Children (Kanji that list this node as a parent)
  const children = allNodes.filter(n => n.parents.includes(focusedNode.id));

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-4 max-w-lg mx-auto overflow-y-auto gap-6 select-none animate-fadeIn">
      
      {/* 1. PARENT COMPONENTS (Top Tier) */}
      <div className="w-full flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <ArrowUp className="w-4 h-4 text-cyan-400 animate-bounce" />
          <span>Prerequisite Components ({parents.length})</span>
        </div>

        {parents.length === 0 ? (
          <div className="px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-500 italic">
            Base Radical / Fundamental Component (No Parent Dependencies)
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {parents.map(p => {
              const pStatus = getNodeStatus(p);
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectNode(p)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border-2 transition-all cursor-pointer shadow-md active:scale-95 ${
                    pStatus === 'MASTERED'
                      ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-amber-500/20'
                      : 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
                  }`}
                >
                  <span className="text-2xl font-bold font-serif">{p.kanji}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">{p.name}</span>
                    <span className="text-[10px] opacity-75">{pStatus}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Downward Connecting Beam */}
      <div className="w-0.5 h-8 bg-gradient-to-b from-cyan-400 via-amber-400 to-cyan-400 animate-pulse" />

      {/* 2. CENTER ACTIVE FOCUS KANJI (Middle Tier) */}
      <div className="w-full relative flex flex-col items-center p-6 rounded-3xl bg-rpg-panel border-2 border-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.3)] gap-4">
        
        {/* Top Status & JLPT Tag */}
        <div className="w-full flex items-center justify-between">
          <span className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
            currentStatus === 'MASTERED'
              ? 'bg-amber-500 text-slate-950'
              : currentStatus === 'AVAILABLE'
              ? 'bg-cyan-400 text-slate-950 animate-pulse'
              : 'bg-slate-800 text-slate-400'
          }`}>
            {currentStatus === 'MASTERED' && <Check className="w-4 h-4 stroke-[3]" />}
            {currentStatus === 'AVAILABLE' && <Sparkles className="w-4 h-4" />}
            {currentStatus === 'LOCKED' && <Lock className="w-4 h-4" />}
            <span>{currentStatus}</span>
          </span>

          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 text-cyan-300 border border-slate-700">
            JLPT {focusedNode.jlpt}
          </span>
        </div>

        {/* Large Kanji Display */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-7xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 via-white to-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]">
            {focusedNode.kanji}
          </span>
          <h2 className="text-xl font-extrabold text-white">
            {focusedNode.name}
          </h2>
          <p className="text-xs text-slate-400">
            {focusedNode.meanings.join(', ')}
          </p>
        </div>

        {/* Mnemonic snippet */}
        <p className="text-xs text-center text-slate-300 italic bg-slate-900/80 p-3 rounded-xl border border-slate-800 w-full">
          "{focusedNode.mnemonic}"
        </p>

        {/* Quick Action Button */}
        {currentStatus !== 'LOCKED' && (
          <button
            onClick={() => onToggleMastery(focusedNode.id)}
            className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
              currentStatus === 'MASTERED'
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
            }`}
          >
            {currentStatus === 'MASTERED' ? 'Marked as Mastered' : 'Mark as Mastered (+XP)'}
          </button>
        )}
      </div>

      {/* Downward Connecting Beam */}
      <div className="w-0.5 h-8 bg-gradient-to-b from-cyan-400 to-purple-400 animate-pulse" />

      {/* 3. UNLOCKED DOWNSTREAM CHILDREN (Bottom Tier) */}
      <div className="w-full flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <ArrowDown className="w-4 h-4 text-amber-400 animate-bounce" />
          <span>Downstream Compound Kanji ({children.length})</span>
        </div>

        {children.length === 0 ? (
          <div className="px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-500 italic">
            Top Level Compound Kanji (No dependent children yet)
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {children.map(c => {
              const cStatus = getNodeStatus(c);
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    if (cStatus !== 'LOCKED') {
                      onSelectNode(c);
                    }
                  }}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border-2 transition-all shadow-md active:scale-95 ${
                    cStatus === 'MASTERED'
                      ? 'bg-amber-950/80 border-amber-400 text-amber-200 cursor-pointer'
                      : cStatus === 'AVAILABLE'
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 cursor-pointer'
                      : 'bg-slate-900/70 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <span className="text-2xl font-bold font-serif">{c.kanji}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">{c.name}</span>
                    <span className="text-[10px] opacity-75">{cStatus}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
