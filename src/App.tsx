import { useState, useMemo } from 'react';
import { INITIAL_KANJI_DATA } from './data/kanjiData';
import type { KanjiNodeData, JLPTLevel, ViewMode } from './types/kanji';
import { useKanjiProgress } from './hooks/useKanjiProgress';
import { HeaderStats } from './components/HeaderStats';
import { SearchBar } from './components/SearchBar';
import { SkillTreeGraph } from './components/SkillTreeGraph';
import { LocalFocusView } from './components/LocalFocusView';
import { KanjiDetailDrawer } from './components/KanjiDetailDrawer';

export function App() {
  const [nodesData] = useState<KanjiNodeData[]>(INITIAL_KANJI_DATA);
  const [selectedJlpt, setSelectedJlpt] = useState<JLPTLevel | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('TREE');
  const [activeDrawerNode, setActiveDrawerNode] = useState<KanjiNodeData | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string>('k_明');

  const { progress, getNodeStatus, toggleMastery, resetProgress } = useKanjiProgress(nodesData);

  // Filter nodes by selected JLPT level
  const filteredNodes = useMemo(() => {
    if (selectedJlpt === 'ALL') return nodesData;
    return nodesData.filter(node => node.jlpt === selectedJlpt);
  }, [nodesData, selectedJlpt]);

  // Mastered Kanji Count
  const masteredCount = useMemo(() => {
    return nodesData.filter(node => progress.masteredIds.includes(node.id)).length;
  }, [nodesData, progress.masteredIds]);

  // Active Focused Node for Local Focus View
  const focusedNode = useMemo(() => {
    return nodesData.find(n => n.id === focusedNodeId) || nodesData[0];
  }, [nodesData, focusedNodeId]);

  // Handle node selection from graph or search
  const handleSelectNode = (node: KanjiNodeData) => {
    setFocusedNodeId(node.id);
    setActiveDrawerNode(node);
  };

  // Jump directly to a parent component when clicked inside drawer
  const handleSelectParentNode = (node: KanjiNodeData) => {
    setFocusedNodeId(node.id);
    setActiveDrawerNode(node);
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-rpg-bg text-slate-100 overflow-hidden font-sans">
      
      {/* 1. TOP HEADER STATS & FILTERS */}
      <HeaderStats
        progress={progress}
        totalKanjiCount={nodesData.length}
        masteredCount={masteredCount}
        selectedJlpt={selectedJlpt}
        viewMode={viewMode}
        onSelectJlpt={setSelectedJlpt}
        onToggleViewMode={setViewMode}
        onResetProgress={resetProgress}
      />

      {/* 2. FLOATING SEARCH BAR OVERLAY */}
      <div className="px-4 py-2 bg-rpg-bg/80 border-b border-slate-800/60 backdrop-blur-sm z-10">
        <SearchBar
          nodes={nodesData}
          getNodeStatus={getNodeStatus}
          onSelectNode={handleSelectNode}
        />
      </div>

      {/* 3. MAIN VISUALIZATION AREA */}
      <main className="flex-1 w-full h-full relative">
        {viewMode === 'TREE' ? (
          <SkillTreeGraph
            nodes={filteredNodes}
            allNodes={nodesData}
            selectedNodeId={activeDrawerNode?.id || null}
            getNodeStatus={getNodeStatus}
            onSelectNode={handleSelectNode}
          />
        ) : (
          <LocalFocusView
            focusedNode={focusedNode}
            allNodes={nodesData}
            getNodeStatus={getNodeStatus}
            onSelectNode={handleSelectNode}
            onToggleMastery={toggleMastery}
          />
        )}
      </main>

      {/* 4. MOBILE DETAIL BOTTOM SHEET DRAWER */}
      {activeDrawerNode && (
        <KanjiDetailDrawer
          kanjiNode={activeDrawerNode}
          status={getNodeStatus(activeDrawerNode)}
          allNodes={nodesData}
          onClose={() => setActiveDrawerNode(null)}
          onToggleMastery={toggleMastery}
          onSelectParentNode={handleSelectParentNode}
        />
      )}
    </div>
  );
}

export default App;
