import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import type { KanjiNodeData, NodeStatus } from '../types/kanji';

interface SearchBarProps {
  nodes: KanjiNodeData[];
  getNodeStatus: (node: KanjiNodeData) => NodeStatus;
  onSelectNode: (node: KanjiNodeData) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  nodes,
  getNodeStatus,
  onSelectNode,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = query.trim()
    ? nodes.filter(n => {
        const q = query.toLowerCase();
        return (
          n.kanji.includes(q) ||
          n.name.toLowerCase().includes(q) ||
          n.meanings.some(m => m.toLowerCase().includes(q)) ||
          n.readings.onyomi.some(r => r.includes(q)) ||
          n.readings.kunyomi.some(r => r.includes(q))
        );
      }).slice(0, 40)
    : [];

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-cyan-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search Kanji by character, meaning, or reading (e.g. 明, bright)..."
          className="w-full bg-slate-900/90 border border-slate-700/70 focus:border-cyan-400 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all shadow-inner"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-2.5 p-1 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && filtered.length > 0 && (
        <div className="absolute top-full mt-2 inset-x-0 bg-rpg-panel border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden z-40 max-h-60 overflow-y-auto">
          {filtered.map(node => {
            const status = getNodeStatus(node);
            return (
              <div
                key={node.id}
                onClick={() => {
                  onSelectNode(node);
                  setIsOpen(false);
                  setQuery('');
                }}
                className="flex items-center justify-between p-2.5 hover:bg-slate-800/80 cursor-pointer border-b border-slate-800/60 last:border-none transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold font-serif text-amber-300">
                    {node.kanji}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200">
                      {node.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {node.meanings.join(', ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                    {node.jlpt}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    status === 'MASTERED'
                      ? 'bg-amber-500 text-slate-950'
                      : status === 'AVAILABLE'
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
