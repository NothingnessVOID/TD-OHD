// User-supplied reference classification. Structural grouping only; no Powerbase inference.
const department = (id, displayPairs) => Object.freeze({
  id, nameKey: `OC16 ${id}`,
  displayPairs: Object.freeze(displayPairs.map(pair => Object.freeze([...pair]))),
  pairs: Object.freeze(displayPairs.map((displayGates, index) => {
    const gates = Object.freeze([...displayGates].sort((a, b) => a - b));
    return Object.freeze({ channelId: gates.join('-'), gates,
      displayGates: Object.freeze([...displayGates]), departmentId: id, role: index === 0 ? 'core' : 'support' });
  }))
});

export const OC16_DEPARTMENTS = Object.freeze([
  department('management', [[45, 21], [54, 32], [44, 26], [19, 49], [37, 40]]),
  department('competition', [[51, 25], [10, 34]]),
  department('direction', [[14, 2], [61, 24], [43, 23], [8, 1]]),
  department('interaction', [[59, 6], [64, 47], [11, 56], [35, 36], [30, 41], [53, 42], [29, 46], [13, 33]]),
  department('logic', [[27, 50], [63, 4], [17, 62], [48, 16], [18, 58], [9, 52], [5, 15], [7, 31]]),
  department('innovation', [[3, 60], [38, 28], [57, 20], [39, 55], [22, 12]])
]);

export const WA_PILLARS = Object.freeze([
  ['structure', 60], ['safety', 50], ['interaction', 6], ['hierarchy', 45]
].map(([id, gate]) => Object.freeze({ id, nameKey: `OC16 ${id}`, gate })));
