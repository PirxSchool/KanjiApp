// Uruchom raz: node scripts/build-kanji.mjs  -> src/data/kanji.generated.json
// Źródła: kanji-data (znaczenia, czytania, kreski, JLPT, klasa) + cjkvi-ids (rozkład na komponenty)
import { writeFile } from 'node:fs/promises';
const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(u + ' ' + r.status); return r; };
const kd = await (await get('https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json')).json();
const idsTxt = await (await get('https://raw.githubusercontent.com/cjkvi/cjkvi-ids/master/ids.txt')).text();

const ids = new Map();
for (const line of idsTxt.split('\n')) {
  if (!line || line.startsWith('#')) continue;
  const [, ch, first] = line.split('\t');
  if (!ch || !first) continue;
  const comps = Array.from(first.replace(/\[[^\]]*\]/g, ''))
    .filter(c => !(c >= '\u2FF0' && c <= '\u2FFF') && !/[\u2460-\u2473?]/.test(c));
  if (!ids.has(ch)) ids.set(ch, [...new Set(comps)].filter(c => c !== ch));
}

const strokes = (c) => kd[c]?.strokes ?? 0;
const selected = Object.keys(kd).filter(k => kd[k].grade && kd[k].grade <= 6); // ~1026 kanji (dodaj: || kd[k].jlpt_new)
const sel = new Set(selected);

// DAG: rodzic musi mieć mniej kresek -> brak cykli, brak "wiecznie zablokowanych" węzłów
const parentsOf = new Map(selected.map(k => [k, (ids.get(k) ?? []).filter(c => strokes(c) < strokes(k))]));
const usage = new Map();
for (const ps of parentsOf.values()) for (const p of ps) usage.set(p, (usage.get(p) ?? 0) + 1);
const keep = (c) => sel.has(c) || (usage.get(c) ?? 0) >= 2;
const radicals = [...usage.keys()].filter(c => !sel.has(c) && keep(c));

const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const idOf = c => (sel.has(c) ? 'k_' : 'r_') + c;
const mk = (c, isRad) => {
  const d = kd[c] ?? {};
  const parents = isRad ? [] : parentsOf.get(c).filter(keep).map(idOf);
  const meanings = (d.meanings ?? []).slice(0, 4);
  return {
    id: idOf(c), kanji: c, name: cap(meanings[0] ?? 'Component'),
    meanings: meanings.length ? meanings : ['component'],
    readings: { onyomi: (d.readings_on ?? []).map(r => r.replace(/[ぁ-ゖ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60))), kunyomi: d.readings_kun ?? [] },
    jlpt: isRad ? 'N5' : d.jlpt_new ? 'N' + d.jlpt_new : 'N1',
    strokeCount: d.strokes ?? 1, isRadicalOnly: isRad, parents,
    mnemonic: parents.length ? `Build it from: ${parents.map(p => p.slice(2)).join(' + ')}.` : 'A basic building block.',
    examples: [],
  };
};
const out = [...radicals.map(c => mk(c, true)), ...selected.map(c => mk(c, false))]
  .sort((a, b) => a.strokeCount - b.strokeCount);
await writeFile('src/data/kanji.generated.json', JSON.stringify(out));
console.log('nodes:', out.length, 'kanji:', selected.length, 'radicals:', radicals.length);
console.log(JSON.stringify(out.find(n => n.kanji === '明')));
