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
  const mastered = useMemo(() => new Set(progress.masteredIds), [progress.masteredIds]);
  const nodeMap = useMemo(() => new Map(allNodes.map(n => [n.id, n])), [allNodes]);

  const getNodeStatus = useCallback((node: KanjiNodeData): NodeStatus => {
    if (mastered.has(node.id)) return 'MASTERED';
    // nieistniejący rodzic nie może blokować węzła na zawsze
    const ok = node.parents.every(p => mastered.has(p) || !nodeMap.has(p));
    return ok ? 'AVAILABLE' : 'LOCKED';
  }, [mastered, nodeMap]);

  const toggleMastery = useCallback((nodeId: string) => {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    const was = mastered.has(nodeId);
    const gained = was ? 0 : node.parents.length > 0 ? 100 : 50;
    const xp = Math.max(0, progress.xp + gained);
    const level = Math.floor(xp / 200) + 1;

    const now = new Date();
    const last = progress.lastStudyDate?.slice(0, 10);
    const streak = last === day(now) ? progress.streak
      : last === day(new Date(now.getTime() - 864e5)) ? progress.streak + 1 : 1;

    // efekty uboczne POZA updaterem (StrictMode wywoływał je podwójnie)
    if (!was) {
      soundFx.playUnlock();
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 },
        colors: ['#06b6d4', '#f59e0b', '#10b981', '#a855f7'] });
      if (level > progress.level) soundFx.playLevelUp();
    }

    setProgress({
      ...progress,
      masteredIds: was ? progress.masteredIds.filter(id => id !== nodeId) : [...progress.masteredIds, nodeId],
      xp, level, streak, lastStudyDate: now.toISOString(),
    });
  }, [progress, mastered, nodeMap]);

  const resetProgress = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all Kanji progress?')) {
      setProgress(INITIAL_PROGRESS);
      soundFx.playTap();
    }
  }, []);

  return { progress, getNodeStatus, toggleMastery, resetProgress };
}
