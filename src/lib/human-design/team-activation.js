// Full Sharp Chart Contract activation provenance; no gate-only fallback.
export const TEAM_PLANETS = Object.freeze([
  'sun', 'earth', 'northNode', 'southNode', 'moon', 'mercury', 'uranus',
  'venus', 'mars', 'neptune', 'saturn', 'jupiter', 'pluto'
]);

export class TeamStructureError extends Error {
  constructor(code, memberId, path, message) {
    super(message);
    this.name = 'TeamStructureError';
    this.code = code;
    this.memberId = memberId;
    this.path = path;
  }
}

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function extractTeamActivations(member) {
  const id = member?.memberId;
  if (typeof id !== 'string' || !id.trim()) {
    throw new TeamStructureError('INVALID_MEMBER_ID', id ?? null, 'memberId', 'memberId must be a nonempty string');
  }
  const fail = (code, path, reason) => {
    throw new TeamStructureError(code, id, path, `Member ${id}: ${path} ${reason}`);
  };
  if (!record(member.chart)) fail('INVALID_CHART', 'chart', 'must be a Sharp Chart Contract object');
  if (!record(member.chart.gates)) fail('INVALID_GATES', 'chart.gates', 'must contain personality and design');
  const result = [];
  for (const side of ['personality', 'design']) {
    const path = `chart.gates.${side}`;
    const sideData = member.chart.gates[side];
    if (!record(sideData)) fail('MISSING_SIDE', path, 'must contain 13 planetary activations');
    for (const planet of TEAM_PLANETS) {
      const point = `${path}.${planet}`;
      if (!own(sideData, planet) || !record(sideData[planet])) fail('MISSING_ACTIVATION', point, 'must be an activation object');
      const { gate, line } = sideData[planet];
      if (!Number.isInteger(gate) || gate < 1 || gate > 64) fail('INVALID_GATE', `${point}.gate`, 'must be an integer from 1 to 64');
      if (!Number.isInteger(line) || line < 1 || line > 6) fail('INVALID_LINE', `${point}.line`, 'must be an integer from 1 to 6');
      if (own(sideData[planet], 'planet') && sideData[planet].planet !== planet) {
        fail('INVALID_PLANET', `${point}.planet`, `must equal the planetary key ${planet}`);
      }
      result.push({ memberId: id, side, planet, gate, line });
    }
    for (const planet of Object.keys(sideData)) {
      if (!TEAM_PLANETS.includes(planet)) fail('UNKNOWN_PLANET', `${path}.${planet}`, 'is not a supported Sharp planet');
    }
  }
  // The fixed Sharp planet order and side order are independent of source object property order.
  return result;
}

export function compareTeamActivations(a, b) {
  const id = a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0;
  if (id) return id;
  const side = ['personality', 'design'].indexOf(a.side) - ['personality', 'design'].indexOf(b.side);
  if (side) return side;
  return TEAM_PLANETS.indexOf(a.planet) - TEAM_PLANETS.indexOf(b.planet);
}
