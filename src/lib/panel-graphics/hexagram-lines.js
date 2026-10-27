/**
 * Gate → its six yao lines.
 *
 * In Human Design the gate number is the I Ching King Wen hexagram number, so
 * the standard sequence table gives each gate's six lines directly. Each entry
 * below is read left to right from line 1 (bottom, 初爻) to line 6 (top, 上爻),
 * 1 = yang (solid), 0 = yin (broken).
 *
 * Why not derive the lines from the mandala's official rect geometry
 * (`HEXAGRAMS`' a/b layers)? Those are two unconditionally stacked paint layers
 * with duplicate and stray rectangles, not a yang/yin split — parsing them is
 * ambiguous for several gates (e.g. 乾 carries a stray yin pair, 坤 a stray full
 * bar). The table below is cross-checked against every unambiguous geometry
 * line in the test (`hexagram-lines-test.mjs`), so the two sources agree.
 */

// King Wen sequence, hexagrams 1–64, six bits bottom-up.
const KING_WEN_LINES = Object.freeze([
  '111111', '000000', '100010', '010001', '111010', '010111', '010000', '000010',
  '111011', '110111', '111000', '000111', '101111', '111101', '001000', '000100',
  '100110', '011001', '110000', '000011', '100101', '101001', '000001', '100000',
  '100111', '111001', '100001', '011110', '010010', '101101', '001110', '011100',
  '001111', '111100', '000101', '101000', '101011', '110101', '001010', '010100',
  '110001', '100011', '111110', '011111', '000110', '011000', '010110', '011010',
  '101110', '011101', '100100', '001001', '001011', '110100', '101100', '001101',
  '011011', '110110', '010011', '110010', '110011', '001100', '101010', '010101'
].map(bits => Object.freeze(bits.split('').map(bit => (bit === '1' ? 'yang' : 'yin')))));

/** @param {number} gate @returns {('yang'|'yin')[]|null} index 0 = line 1 (bottom, 初爻) */
export function hexagramLines(gate) {
  const index = Number(gate) - 1;
  return index >= 0 && index < 64 ? KING_WEN_LINES[index] : null;
}

/**
 * Geometry cross-check: the lines of `gate` recovered from the mandala's rect
 * data, keeping only the unambiguous positions (a lone full-width bar = yang, a
 * lone half pair = yin). Used by the test to prove the table and the official
 * geometry never disagree where the geometry is readable.
 */
export function hexagramLinesFromGeometry(gate, entry) {
  if (!entry) return null;
  // The official rects repeat a line with float noise (40.363 / 40.364), so rows
  // are keyed by the rounded y offset — the six positions are ~10 units apart.
  const rows = new Map();
  const row = rect => Math.round(rect[1]);
  for (const rect of entry.a || []) if (rect[2] > 40) rows.set(row(rect), 'yang');
  for (const rect of entry.a || []) if (rect[2] < 40 && rows.get(row(rect)) === 'yang') rows.set(row(rect), 'ambiguous');
  for (const rect of entry.b || []) if (rect[2] < 40) {
    const key = row(rect);
    if (!rows.has(key)) rows.set(key, 'yin');
    else if (rows.get(key) === 'yang') rows.set(key, 'ambiguous');
  }
  // Descending y = bottom-up = line 1 … line 6.
  return [...rows.entries()].sort((x, y) => y[0] - x[0]).map(([, kind]) => kind);
}
