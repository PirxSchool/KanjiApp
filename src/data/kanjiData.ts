import type { KanjiNodeData } from '../types/kanji';
import data from './kanji.generated.json'; // generowane: node scripts/build-kanji.mjs

export const INITIAL_KANJI_DATA = data as unknown as KanjiNodeData[];
