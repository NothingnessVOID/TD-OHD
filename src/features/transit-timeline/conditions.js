function intervalAt(row, time) {
  let lo = 0; let hi = row.intervals.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (row.intervals[mid].end <= time) lo = mid + 1;
    else hi = mid;
  }
  const interval = row.intervals[lo];
  return interval?.start <= time ? interval : null;
}

/** Boolean conditions over complete derived intervals; never scans astronomy. */
export function queryTimeline(result, conditions, { combine = 'all', mode = 'overlay', natalIslandCount = 0,
  catalog = result?.rows || [] } = {}) {
  if (!result?.rows || !Number.isFinite(result.start) || !Number.isFinite(result.end)) {
    throw new Error('Timeline data is unavailable');
  }
  if (!Array.isArray(conditions) || conditions.length === 0) throw new Error('Add at least one condition');
  if (!['all', 'any'].includes(combine)) throw new Error('Invalid condition combination');
  const available = new Set(catalog.map(row => row.key));
  const rows = new Map(result.rows.map(row => [row.key, row]));
  const normalized = conditions.map(condition => {
    if (condition.kind === 'bridge') {
      if (condition.state !== 'active') throw new Error('Bridge only matches connected natal islands');
      if (mode !== 'overlay') throw new Error('Bridge requires birth chart + transits mode');
      if (natalIslandCount < 2) throw new Error(natalIslandCount === 0
        ? 'No natal definition islands to bridge' : 'Natal definition is already connected');
      return { keys: ['bridge:natal'], state: condition.state };
    }
    if (!['gate', 'line', 'channel', 'center'].includes(condition.kind) ||
        !['active', 'inactive'].includes(condition.state) || !Array.isArray(condition.ids) || condition.ids.length !== 1) {
      throw new Error('Invalid condition');
    }
    const keys = [...new Set(condition.ids.map(id => {
      const key = `${condition.kind}:${id}`;
      if (condition.kind !== 'channel' || available.has(key)) return key;
      const reversed = `${condition.kind}:${String(id).split('-').reverse().join('-')}`;
      return available.has(reversed) ? reversed : key;
    }))];
    if (keys.some(key => !available.has(key) || !rows.has(key))) throw new Error('Unknown condition target');
    return { keys, state: condition.state };
  });
  const boundaries = new Set([result.start, result.end]);
  for (const condition of normalized) for (const key of condition.keys) {
    for (const interval of rows.get(key).intervals) {
      boundaries.add(interval.start); boundaries.add(interval.end);
    }
  }
  const sorted = [...boundaries].filter(value => value >= result.start && value <= result.end).sort((a, b) => a - b);
  const intervals = [];
  const bridgeSelected = normalized.some(condition => condition.keys.includes('bridge:natal'));
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]; const end = sorted[i + 1];
    if (start === end) continue;
    const matches = normalized.map(condition => {
      return condition.keys.some(key => {
        const active = Boolean(intervalAt(rows.get(key), start));
        return condition.state === 'active' ? active : !active;
      });
    });
    if (!(combine === 'all' ? matches.every(Boolean) : matches.some(Boolean))) continue;
    const bridgeGroup = bridgeSelected ? intervalAt(rows.get('bridge:natal'), start)?.source || '' : '';
    const previous = intervals.at(-1);
    if (previous?.end === start && previous.bridgeGroup === bridgeGroup) previous.end = end;
    else intervals.push({ start, end, bridgeGroup });
  }
  return { start: result.start, end: result.end, intervals,
    fullRange: intervals.length === 1 && intervals[0].start === result.start && intervals[0].end === result.end,
    empty: intervals.length === 0 };
}
