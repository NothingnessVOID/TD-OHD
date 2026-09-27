/** Corrected Rave Mandala quarter lookup; raw engine and translations stay intact.
 * Jovian Archive: each quarter has 16 consecutive gates, from 13–24, 2–33,
 * 7–44, and 1–19 respectively. The order below follows the pinned engine's
 * GATE_ORDER and agrees with the published Gate 13–24 initiation list.
 * https://jovianarchive.com/pages/human-design-dictionary
 * https://jovianarchive.com/products/incarnation-crosses-by-profile
 */
const quarterGates = [
  [13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3, 27, 24],
  [2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56, 31, 33],
  [7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50, 28, 44],
  [1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60, 41, 19]
];
const byGate = new Map(quarterGates.flatMap((gates, index) => gates.map(gate => [gate, index])));
const labels = {
  en: ['Initiation', 'Civilization', 'Duality', 'Mutation'],
  'zh-CN': ['启蒙', '文明', '二元性', '突变'],
  'zh-Hant': ['啟蒙', '文明', '二元性', '突變']
};

export function quarterForGate(gate, locale = 'en') {
  const index = byGate.get(Number(gate));
  return index === undefined ? null : (labels[locale] || labels.en)[index];
}

export const quarterGroups = quarterGates.map(gates => [...gates]);
