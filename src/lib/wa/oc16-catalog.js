// User-supplied reference classification. Structural grouping only; no Powerbase inference.
// OC16 organizing scope: six core Wa channels + 人事 44–26 under management.
const department = (id, displayPairs) => Object.freeze({
  id, nameKey: `OC16 ${id}`,
  displayPairs: Object.freeze(displayPairs.map(pair => Object.freeze([...pair]))),
  pairs: Object.freeze(displayPairs.map((displayGates, index) => {
    const gates = Object.freeze([...displayGates].sort((a, b) => a - b));
    const role = index === 0 ? 'core' : id === 'management' ? 'personnel' : 'support';
    return Object.freeze({ channelId: gates.join('-'), gates,
      displayGates: Object.freeze([...displayGates]), departmentId: id, role });
  }))
});

export const OC16_DEPARTMENTS = Object.freeze([
  department('management', [[45, 21], [44, 26]]),
  department('competition', [[51, 25]]),
  department('direction', [[14, 2]]),
  department('interaction', [[59, 6]]),
  department('logic', [[27, 50]]),
  department('innovation', [[3, 60]])
]);

/** Four pillars (overview): core 45–21 plus 人事 44–26 (replaces the old four single-gate pillars). */
export const WA_MANAGEMENT_MECHANISM = Object.freeze([
  Object.freeze({ id: 'management', channelId: '21-45',
    displayGates: Object.freeze([45, 21]), nameKey: 'OC16 management' }),
  Object.freeze({ id: 'personnel', channelId: '26-44',
    displayGates: Object.freeze([44, 26]), nameKey: 'OC16 personnel' })
]);

export const OC16_GATE_TOTAL = OC16_DEPARTMENTS.reduce(
  (sum, department) => sum + department.pairs.reduce((n, pair) => n + pair.gates.length, 0), 0);
export const OC16_PAIR_TOTAL = OC16_DEPARTMENTS.reduce((sum, department) => sum + department.pairs.length, 0);
