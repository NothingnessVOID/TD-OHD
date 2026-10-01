/** Graph derivation from discrete activations; no ephemeris import. */
import { CHANNELS, CENTERS, GATES } from '../../lib/human-design/catalog.js';
import { buildTransitGraph } from '../../lib/transit-graph.js';
import { bridgeState } from './bridge.js';

export function catalog() {
  return [
    { key: 'bridge:natal', kind: 'bridge', id: 'natal', name: 'Natal definition bridge' },
    ...Object.entries(CENTERS).map(([id, center]) => ({ key: `center:${id}`, kind: 'center', id, name: center.name })),
    ...CHANNELS.map(channel => ({ key: `channel:${channel.gates.join('-')}`, kind: 'channel', id: channel.gates.join('-'), name: channel.name })),
    ...Object.entries(GATES).flatMap(([id, gate]) => [
      { key: `gate:${id}`, kind: 'gate', id: Number(id), name: gate.name },
      ...Array.from({ length: 6 }, (_, index) => ({ key: `line:${id}.${index + 1}`, kind: 'line',
        id: `${id}.${index + 1}`, gate: Number(id), line: index + 1, name: gate.name }))
    ])
  ];
}

export function stateAt(natal, activations, mode, planet = 'all') {
  const effective = planet === 'all' ? activations : { [planet]: activations[planet] };
  const model = buildTransitGraph(natal, effective, mode);
  const states = new Map();
  for (const gate of model.activeGates) states.set(`gate:${gate}`, model.gateSource(gate));
  const natalLines = new Set(mode === 'overlay' ? natal.lines || [] : []);
  const transitLines = new Set(Object.values(effective).filter(Boolean).map(value => `${value.gate}.${value.line}`));
  for (const line of new Set([...natalLines, ...transitLines])) {
    states.set(`line:${line}`, natalLines.has(line)
      ? transitLines.has(line) ? 'both' : 'natal' : 'transit');
  }
  for (const channel of model.channels) states.set(`channel:${channel.gates.join('-')}`, model.channelSource(channel));
  for (const center of model.definedCenters) {
    states.set(`center:${center}`, mode === 'overlay' && model.natalCenters.has(center) ? 'natal' : 'transit');
  }
  // This row describes how current transits connect the fixed natal islands,
  // even when the bodygraph is displaying transit activations alone.
  const combinedGates = new Set([...natal.gates.all, ...Object.values(effective).filter(Boolean).map(value => value.gate)]);
  const bridge = bridgeState(natal, combinedGates);
  if (bridge.connected.length) states.set('bridge:natal', JSON.stringify(bridge.connected));
  return states;
}

// Birth identity includes all data used by this provider; no names or birth data
// are sent to the worker, persisted by the feature, or used as cache keys.
export function natalIdentity(chart) {
  const identity = {
    gates: { all: [...chart.gates.all].sort((a, b) => a - b) },
    centers: { definedNames: [...chart.centers.definedNames].sort() }
  };
  const activations = [...Object.values(chart.gates.personality || {}), ...Object.values(chart.gates.design || {})];
  if (activations.length) identity.lines = [...new Set(activations.filter(value => value?.gate && value?.line)
    .map(value => `${value.gate}.${value.line}`))].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  return identity;
}
