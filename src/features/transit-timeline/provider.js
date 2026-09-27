/** The only calculation adapter that knows NatalEngine and the app graph model. */
import { calculateTransitGates, CHANNELS, CENTERS, GATES } from 'natalengine';
import { engineTransitArguments } from '../../lib/transit-time.js';
import { buildTransitGraph } from '../../lib/transit-graph.js';

export function snapshot(instant) {
  return calculateTransitGates(...engineTransitArguments(instant)).gates;
}

export function catalog(eventLevel = 'gate') {
  return [
    ...Object.entries(CENTERS).map(([id, center]) => ({ key: `center:${id}`, kind: 'center', id, name: center.name })),
    ...CHANNELS.map(channel => ({ key: `channel:${channel.gates.join('-')}`, kind: 'channel', id: channel.gates.join('-'), name: channel.name })),
    ...Object.entries(GATES).map(([id, gate]) => ({ key: `gate:${id}`, kind: 'gate', id: Number(id), name: gate.name })),
    ...(eventLevel === 'line' ? Object.keys(GATES).flatMap(gate => Array.from({ length: 6 }, (_, index) => ({
      key: `line:${gate}.${index + 1}`, kind: 'line', id: `${gate}.${index + 1}`, gate: Number(gate), line: index + 1
    }))) : [])
  ];
}

export function stateAt(natal, activations, mode, eventLevel = 'gate') {
  const model = buildTransitGraph(natal, activations, mode);
  const states = new Map();
  for (const gate of model.activeGates) states.set(`gate:${gate}`, model.gateSource(gate));
  for (const channel of model.channels) states.set(`channel:${channel.gates.join('-')}`, model.channelSource(channel));
  for (const center of model.definedCenters) {
    states.set(`center:${center}`, mode === 'overlay' && model.natalCenters.has(center) ? 'natal' : 'transit');
  }
  if (eventLevel === 'line') {
    const natalLines = new Set(mode === 'overlay' ? natal.gates.lines || [] : []);
    for (const line of natalLines) states.set(`line:${line}`, 'natal');
    for (const activation of Object.values(activations)) {
      if (!activation?.gate || !activation?.line) continue;
      const key = `line:${activation.gate}.${activation.line}`;
      states.set(key, natalLines.has(`${activation.gate}.${activation.line}`) ? 'both' : 'transit');
    }
  }
  return states;
}

// Birth identity includes all data used by this provider; no names or birth data
// are sent to the worker, persisted by the feature, or used as cache keys.
export function natalIdentity(chart) {
  const identity = {
    gates: { all: [...chart.gates.all].sort((a, b) => a - b) },
    centers: { definedNames: [...chart.centers.definedNames].sort() }
  };
  if (chart.gates.design || chart.gates.personality) {
    identity.gates.lines = [...new Set(['design', 'personality'].flatMap(side =>
      Object.values(chart.gates[side] || {}).filter(value => value?.gate && value?.line)
        .map(value => `${value.gate}.${value.line}`)))].sort();
  }
  return identity;
}
