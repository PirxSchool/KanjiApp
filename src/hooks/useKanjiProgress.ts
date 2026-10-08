import { useState, useEffect, useCallback, useMemo } from 'react';
import type { KanjiNodeData, NodeStatus, UserProgress } from '../types/kanji';
import { soundFx } from '../utils/audio';
import confetti from 'canvas-confetti';

const STORAGE_KEY = 'kanji_rpg_progress_v2';

const INITIAL_PROGRESS: UserProgress = {
  masteredIds: [], xp: 0, level: 1, streak: 1, lastStudyDate: null,
};

const day = (d: Date) => d.toISOString().slice(0, 10);

export function useKanjiProgress(allNodes: KanjiNodeData[]) {
  const [progress, setProgress] = useState<UserProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...INITIAL_PROGRESS, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Failed to load progress', e);
    }
    return INITIAL_PROGRESS;
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
    catch (e) { console.error('Failed to save progress', e); }
  }, [progress]);

  // Set = O(1) zamiast Array.includes przy 1000+ węzłach
  const masteredSet = useMemo(() => new Set(progress.masteredIds), [progress.masteredIds]);
  const nodeMap = useMemo(() => new Map(allNodes.map(n => [n.id, n])), [allNodes]);

  const getNodeStatus = useCallback((node: KanjiNodeData): NodeStatus => {
    if (masteredSet.has(node.id)) return 'MASTERED';
    // nieistniejący rodzic nie może blokować węzła na zawsze
    const ok = node.parents.every(p => masteredSet.has(p) || !nodeMap.has(p));
    return ok ? 'AVAILABLE' : 'LOCKED';
  }, [masteredSet, nodeMap]);

  const toggleMastery = useCallback((nodeId: string) => {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    const wasMastered = masteredSet.has(nodeId);
    const xpDelta = node.parents.length > 0 ? 100 : 50;

    // Efekty uboczne POZA updaterem (StrictMode wywoływał je podwójnie)
    if (!wasMastered) {
      soundFx.playUnlock();
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 },
        colors: ['#06b6d4', '#f59e0b', '#10b981', '#a855f7'] });
    }

    setProgress(prev => {
      const newXp = Math.max(0, prev.xp + (wasMastered ? -xpDelta : xpDelta));
      const newLevel = Math.floor(newXp / 200) + 1;

      const now = new Date();
      const last = prev.lastStudyDate?.slice(0, 10);
      const streak = last === day(now) ? prev.streak
        : last === day(new Date(now.getTime() - 864e5)) ? prev.streak + 1 : 1;

      if (!wasMastered && newLevel > prev.level) {
        soundFx.playLevelUp();
      }

      return {
        ...prev,
        masteredIds: wasMastered
          ? prev.masteredIds.filter(id => id !== nodeId)
          : [...prev.masteredIds, nodeId],
        xp: newXp,
        level: newLevel,
        streak,
        lastStudyDate: now.toISOString(),
      };
    });
  }, [masteredSet, nodeMap]);

  const resetProgress = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all Kanji progress?')) {
      setProgress(INITIAL_PROGRESS);
      soundFx.playTap();
    }
  }, []);

  return { progress, masteredSet, getNodeStatus, toggleMastery, resetProgress };
}
