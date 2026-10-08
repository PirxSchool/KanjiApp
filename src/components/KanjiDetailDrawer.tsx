import React from 'react';
import { X, Volume2, Sparkles, Check, Lock, BookOpen, Layers, Zap } from 'lucide-react';
import type { KanjiNodeData, NodeStatus } from '../types/kanji';
import { StrokeAnimator } from './StrokeAnimator';
import { soundFx } from '../utils/audio';

interface KanjiDetailDrawerProps {
  kanjiNode: KanjiNodeData | null;
  status: NodeStatus;
  allNodes: KanjiNodeData[];
  onClose: () => void;
  onToggleMastery: (id: string) => void;
  onSelectParentNode: (node: KanjiNodeData) => void;
}

export const KanjiDetailDrawer: React.FC<KanjiDetailDrawerProps> = ({
  kanjiNode,
  status,
  allNodes,
  onClose,
  onToggleMastery,
  onSelectParentNode,
}) => {
  if (!kanjiNode) return null;

  const parentNodes = kanjiNode.parents
    .map(pId => allNodes.find(n => n.id === pId))
    .filter((n): n is KanjiNodeData => n !== undefined);

  const handleAudioPlay = (text: string) => {
    soundFx.speakJapanese(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop tap to dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Sheet Content Drawer */}
      <div className="w-full max-w-xl mx-auto bg-rpg-panel border-t-2 border-cyan-500/40 rounded-t-3xl shadow-[0_-10px_35px_rgba(6,182,212,0.2)] p-5 pb-8 flex flex-col gap-5 max-h-[85vh] overflow-y-auto text-slate-200 relative">
        
        {/* Handle pill for dragging */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto -mt-1 mb-1 opacity-70" />

        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              JLPT {kanjiNode.jlpt}
            </span>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              {kanjiNode.strokeCount} Strokes
            </span>
            {kanjiNode.isRadicalOnly && (
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-950 text-purple-300 border border-purple-500/30">
                Base Component
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Grid: Visual Kanji Stroke Animator + Basic Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-rpg-card/60 p-4 rounded-2xl border border-rpg-border">
          <div className="flex justify-center">
            <StrokeAnimator kanji={kanjiNode.kanji} strokes={kanjiNode.svgStrokes} size={150} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white tracking-wide">
                {kanjiNode.name}
              </h2>
              <button
                onClick={() => handleAudioPlay(kanjiNode.kanji)}
                className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-500 hover:text-slate-950 transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                title="Listen to Japanese Pronunciation"
              >
                <Volume2 className="w-5 h-5" />
                <span className="text-xs font-bold">Audio</span>
              </button>
            </div>

            {/* Meanings Badges */}
            <div className="flex flex-wrap gap-1.5 my-1">
              {kanjiNode.meanings.map((m, idx) => (
                <span key={idx} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-cyan-200 border border-slate-700">
                  {m}
                </span>
              ))}
            </div>

            {/* Readings */}
            <div className="flex flex-col gap-1 text-xs mt-1 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold w-14">Onyomi:</span>
                <span className="text-slate-200 font-mono">
                  {kanjiNode.readings.onyomi.join(', ') || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold w-14">Kunyomi:</span>
                <span className="text-slate-200 font-mono">
                  {kanjiNode.readings.kunyomi.join(', ') || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Component Breakdown (Prerequisites) */}
        {parentNodes.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Constituent Components Required ({parentNodes.length})</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {parentNodes.map(parent => (
                <div
                  key={parent.id}
                  onClick={() => onSelectParentNode(parent)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-400 cursor-pointer transition-all active:scale-95 group"
                >
                  <span className="text-2xl font-bold text-amber-300 font-serif group-hover:scale-110 transition-transform">
                    {parent.kanji}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {parent.name}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      {parent.jlpt}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mnemonic RPG Story */}
        <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-gradient-to-br from-purple-950/40 via-slate-900/60 to-slate-900/90 border border-purple-500/30">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-purple-400" />
            <span>RPG Mnemonic Story</span>
          </h3>
          <p className="text-xs text-slate-300 italic leading-relaxed">
            "{kanjiNode.mnemonic}"
          </p>
        </div>

        {/* Example Vocabulary */}
        {kanjiNode.examples.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Example Vocabulary</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {kanjiNode.examples.map((ex, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleAudioPlay(ex.japanese)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-400/50 cursor-pointer transition-all"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white font-serif">
                      {ex.japanese}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {ex.romaji}
                    </span>
                  </div>
                  <span className="text-xs text-amber-300 font-medium">
                    {ex.english}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Mastery Action Button */}
        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-3">
          {status === 'LOCKED' ? (
            <div className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
              <Lock className="w-4 h-4" />
              <span>Locked (Master required parents first)</span>
            </div>
          ) : (
            <button
              onClick={() => {
                onToggleMastery(kanjiNode.id);
                onClose();
              }}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 ${
                status === 'MASTERED'
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/30'
                  : 'bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500 text-slate-950 hover:brightness-110 shadow-cyan-500/30 animate-pulse-glow'
              }`}
            >
              {status === 'MASTERED' ? (
                <>
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>Mastered! (Click to Unmark)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 fill-slate-950" />
                  <span>Mark as Mastered (+{kanjiNode.parents.length > 0 ? '100' : '50'} XP)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
