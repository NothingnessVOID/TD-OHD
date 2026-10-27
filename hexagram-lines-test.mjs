import { hexagramLines, hexagramLinesFromGeometry } from './src/lib/panel-graphics/hexagram-lines.js';
import { HEXAGRAMS } from './src/lib/panel-graphics/mandala-data.js';

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

const bits = gate => hexagramLines(gate).map(k => (k === 'yang' ? '1' : '0')).join('');

// Known hexagrams, bottom-up (line 1 … line 6).
const KNOWN = {
  1: '111111', 2: '000000',                      // 乾 / 坤
  6: '010111', 7: '010000',                       // 訟（坎下乾上）/ 師（坎下坤上）
  11: '111000', 12: '000111',                     // 泰 / 否
  29: '010010', 30: '101101',                     // 坎為水 / 離為火
  51: '100100', 52: '001001', 57: '011011', 58: '110110', // 震 / 艮 / 巽 / 兌
  63: '101010', 64: '010101'                      // 既濟 / 未濟
};

let bad = [];
for (let g = 1; g <= 64; g++) {
  const lines = hexagramLines(g);
  if (!lines || lines.length !== 6 || lines.some(k => k !== 'yang' && k !== 'yin')) bad.push(g);
}
check('64 个闸门都能取到六爻', bad.length === 0, bad.join(','));
check('未知闸门返回 null', hexagramLines(0) === null && hexagramLines(65) === null && hexagramLines('x') === null);

for (const [gate, expected] of Object.entries(KNOWN)) {
  check(`闸门 ${gate} = ${expected}`, bits(Number(gate)) === expected, `got ${bits(Number(gate))}`);
}

// Structural invariant: across the 64 hexagrams the number of yang lines follows
// the binomial distribution C(6,k) = 1,6,15,20,15,6,1. A single mistyped entry
// breaks this, so it validates the whole table at once.
const tally = {};
for (let g = 1; g <= 64; g++) {
  const n = hexagramLines(g).filter(k => k === 'yang').length;
  tally[n] = (tally[n] || 0) + 1;
}
const expectedTally = [1, 6, 15, 20, 15, 6, 1];
check('阳爻数量分布符合 C(6,k)',
  expectedTally.every((want, k) => (tally[k] || 0) === want),
  expectedTally.map((want, k) => `${k}阳:${tally[k] || 0}/${want}`).join(' '));

// Cross-check against the official mandala geometry where it is unambiguous.
let compared = 0, strong = 0, mismatches = [];
for (const entry of HEXAGRAMS) {
  const fromGeometry = hexagramLinesFromGeometry(entry.g, entry);
  const fromTable = hexagramLines(entry.g);
  if (!fromGeometry || fromGeometry.length !== 6) { mismatches.push(`${entry.g}:shape`); continue; }
  let usable = 0;
  fromGeometry.forEach((kind, i) => {
    if (kind === 'ambiguous') return;
    usable++;
    if (kind !== fromTable[i]) mismatches.push(`${entry.g}L${i + 1}:geo=${kind} table=${fromTable[i]}`);
  });
  compared += usable;
  if (usable >= 5) strong++;
}
check('与官方几何无冲突', mismatches.length === 0, mismatches.slice(0, 10).join(' '));
check('几何交叉验证覆盖面足够', compared >= 300 && strong >= 40, `可比对爻数=${compared} 强验证闸门=${strong}/64`);

console.log(failures === 0 ? 'ALL PASS' : `${failures} CHECK(S) FAILED`);
