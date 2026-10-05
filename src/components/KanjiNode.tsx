import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Lock, Check, Sparkles, Layers } from 'lucide-react';
import type { KanjiNodeData, NodeStatus } from '../types/kanji';

interface KanjiNodeProps {
  data: {
    node: KanjiNodeData;
    status: NodeStatus;
    isSelected: boolean;
    onSelect: (node: KanjiNodeData) => void;
  };
}

export const KanjiNodeComponent = memo(({ data }: KanjiNodeProps) => {
  const { node, status, isSelected, onSelect } = data;

  const getStatusStyles = () => {
    switch (status) {
      case 'MASTERED':
        return {
          card: 'bg-amber-950/70 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] text-amber-100',
          badge: 'bg-amber-500 text-slate-950',
          kanjiText: 'text-amber-200 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]',
          borderRing: 'ring-2 ring-amber-400/40',
        };
      case 'AVAILABLE':
        return {
          card: 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.4)] animate-pulse-glow hover:scale-105 text-cyan-100',
          badge: 'bg-cyan-400 text-slate-950 animate-bounce',
          kanjiText: 'text-cyan-200 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]',
          borderRing: 'ring-2 ring-cyan-400/70',
        };
      case 'LOCKED':
      default:
        return {
          card: 'bg-slate-900/60 border-slate-700/60 text-slate-500 hover:border-slate-500 opacity-75',
          badge: 'bg-slate-800 text-slate-400',
          kanjiText: 'text-slate-500',
          borderRing: '',
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div
      onClick={() => {
        if (status !== 'LOCKED') {
          onSelect(node);
        }
      }}
      className={`relative w-24 h-28 rounded-2xl border-2 p-2 flex flex-col items-center justify-between transition-all duration-300 select-none backdrop-blur-md ${styles.card} ${styles.borderRing} ${
        status === 'LOCKED' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${
        isSelected ? 'scale-110 ring-4 ring-cyan-300 z-30 shadow-[0_0_30px_rgba(34,211,238,0.8)]' : ''
      }`}
    >
      {/* React Flow Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-slate-900 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
      />

      {/* Top Header Row: Status Badge & JLPT Tag */}
      <div className="w-full flex items-center justify-between text-[10px] font-bold">
        <span className={`px-1.5 py-0.5 rounded-md ${styles.badge} flex items-center gap-0.5 shadow-sm`}>
          {status === 'MASTERED' && <Check className="w-3 h-3 stroke-[3]" />}
          {status === 'AVAILABLE' && <Sparkles className="w-3 h-3" />}
          {status === 'LOCKED' && <Lock className="w-3 h-3" />}
        </span>

        <span className="text-[10px] tracking-tight px-1.5 py-0.5 rounded bg-slate-800/80 text-cyan-300 border border-slate-700/50">
          {node.jlpt}
        </span>
      </div>

      {/* Central Kanji Glyph */}
      <div className="my-auto flex items-center justify-center">
        <span className={`text-3xl font-bold font-serif ${styles.kanjiText}`}>
          {node.kanji}
        </span>
      </div>

      {/* Bottom Footer Row: English Name & Component Tag */}
      <div className="w-full text-center truncate">
        <p className="text-[11px] font-medium tracking-tight text-slate-300 truncate">
          {node.name}
        </p>
        {node.parents.length > 0 && (
          <div className="flex items-center justify-center gap-0.5 text-[9px] text-slate-400">
            <Layers className="w-2.5 h-2.5" />
            <span>{node.parents.length} req</span>
          </div>
        )}
      </div>
    </div>
  );
});

KanjiNodeComponent.displayName = 'KanjiNodeComponent';
