export type NodeStatus = 'LOCKED' | 'AVAILABLE' | 'MASTERED';

export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface Reading {
  onyomi: string[];
  kunyomi: string[];
}

export interface KanjiExample {
  japanese: string;
  romaji: string;
  english: string;
}

export interface KanjiNodeData {
  id: string; // unique identifier, e.g. "sun_日"
  kanji: string; // single character, e.g. "日"
  name: string; // e.g. "Sun"
  meanings: string[];
  readings: Reading;
  jlpt: JLPTLevel;
  strokeCount: number;
  isRadicalOnly: boolean;
  parents: string[]; // Parent component IDs required to unlock
  mnemonic: string;
  examples: KanjiExample[];
  svgStrokes?: string[]; // SVG path strings for animated strokes
}

export interface UserProgress {
  masteredIds: string[];
  xp: number;
  level: number;
  streak: number;
  lastStudyDate: string | null;
}

export type ViewMode = 'TREE' | 'FOCUS';
