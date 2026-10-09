// Penta topology transcribed from Jovian Archive's official Penta diagram.
// https://jovianarchive.com/blogs/deeper-mechanics-system-theory/the-penta
// This catalog intentionally contains no BG5 skill-to-gate interpretations.
const rows = [
  { center: 'throat', gates: [31, 8, 33] },
  { center: 'g', gates: [7, 1, 13] },
  { center: 'g', gates: [15, 2, 46] },
  { center: 'sacral', gates: [5, 14, 29] }
];

export const PENTA_GATES = Object.freeze(rows.flatMap(({ center, gates }, row) =>
  gates.map((gate, column) => Object.freeze({ gate, row, column, center }))));

const position = gate => {
  const { row, column } = PENTA_GATES.find(cell => cell.gate === gate);
  return Object.freeze({ row, column });
};

// Canonical ID sorts numeric gate numbers; gates remain in top-to-bottom display order.
const edges = [[31, 7], [8, 1], [33, 13], [15, 5], [2, 14], [46, 29]];
export const PENTA_CHANNELS = Object.freeze(edges.map(([upper, lower], displayOrder) => Object.freeze({
  channelId: [upper, lower].sort((a, b) => a - b).join('-'),
  gates: Object.freeze([upper, lower]),
  endpoints: Object.freeze([position(upper), position(lower)]),
  centers: Object.freeze([PENTA_GATES.find(cell => cell.gate === upper).center,
    PENTA_GATES.find(cell => cell.gate === lower).center]),
  displayOrder
})));
