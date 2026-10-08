import { CHANNELS, CENTERS, GATES } from './catalog.js';

const centerNames = Object.keys(CENTERS);
const gateKey = gate => String(gate);

function chartGates(chart) {
  return new Set((chart?.gates?.all || []).map(gateKey));
}

function hasGateInCenter(chart, center) {
  return (chart?.gates?.all || []).some(gate => GATES[gateKey(gate)]?.center === center);
}

function channelInfo(channel) {
  return {
    channel: channel.name,
    gates: [...channel.gates],
    centers: [...channel.centers],
    theme: channel.theme,
    circuit: channel.circuit
  };
}

function componentsFor(channels) {
  const adjacency = new Map();
  for (const channel of channels) {
    const [left, right] = channel.centers;
    if (!adjacency.has(left)) adjacency.set(left, new Set());
    if (!adjacency.has(right)) adjacency.set(right, new Set());
    adjacency.get(left).add(right);
    adjacency.get(right).add(left);
  }
  const components = [];
  const seen = new Set();
  for (const center of adjacency.keys()) {
    if (seen.has(center)) continue;
    const queue = [center];
    const centers = [];
    seen.add(center);
    while (queue.length) {
      const current = queue.shift();
      centers.push(current);
      for (const next of adjacency.get(current)) {
        if (!seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
    centers.sort((a, b) => centerNames.indexOf(a) - centerNames.indexOf(b));
    const set = new Set(centers);
    components.push({
      id: `component:${components.length + 1}`,
      centers,
      channels: channels.filter(channel => channel.centers.every(item => set.has(item))).map(channel => channel.name)
    });
  }
  return components;
}

function shortestWitness(start, target, channels) {
  const queue = [{ center: start, centers: [start], channels: [] }];
  const visited = new Set([start]);
  while (queue.length) {
    const path = queue.shift();
    if (path.center === target) return path;
    for (const channel of channels) {
      const [a, b] = channel.centers;
      const next = a === path.center ? b : b === path.center ? a : null;
      if (next && !visited.has(next)) {
        visited.add(next);
        queue.push({ center: next, centers: [...path.centers, next], channels: [...path.channels, channel] });
      }
    }
  }
  return null;
}

function bridgingFor(person, ownGates, partnerGates, compositeChannels, ownChannels, compositeComponents) {
  const ownComponents = componentsFor(ownChannels);
  const regions = ownComponents.map((component, index) => ({
    id: `${person}:region:${index + 1}`,
    centers: [...component.centers],
    channels: [...component.channels],
    gates: [...new Set(ownChannels.filter(channel => component.channels.includes(channel.name)).flatMap(channel => channel.gates).filter(gate => ownGates.has(gateKey(gate))))].sort((a, b) => a - b),
    compositeComponentId: compositeComponents.find(composite => component.centers.some(center => composite.centers.includes(center)))?.id || null
  }));
  const mapped = new Map();
  for (const region of regions) {
    if (!mapped.has(region.compositeComponentId)) mapped.set(region.compositeComponentId, []);
    mapped.get(region.compositeComponentId).push(region);
  }
  const groups = [...mapped.values()];
  const bridgedRegionCount = regions.length - groups.length;
  if (regions.length < 2) return { person, status: 'not-applicable', reason: 'fewer-than-two-original-regions', originalRegionCount: regions.length, bridgedRegionCount: 0, regions, witnesses: [] };
  const witnesses = [];
  for (const group of groups) {
    if (group.length < 2) continue;
    const root = group[0];
    for (const targetRegion of group.slice(1)) {
      let best = null;
      for (const start of root.centers) for (const target of targetRegion.centers) {
        const path = shortestWitness(start, target, compositeChannels);
        if (path && (!best || path.channels.length < best.channels.length)) best = path;
      }
      if (!best) continue;
      witnesses.push({
        fromRegion: root.id, toRegion: targetRegion.id, centers: best.centers,
        channels: best.channels.map(channel => ({
          ...channelInfo(channel),
          source: ownChannels.includes(channel) ? 'self' : partnerGates.has(gateKey(channel.gates[0])) && partnerGates.has(gateKey(channel.gates[1])) ? 'partner' : 'composite',
          gateSources: Object.fromEntries(channel.gates.map(gate => [gate, ownGates.has(gateKey(gate)) && partnerGates.has(gateKey(gate)) ? 'both' : ownGates.has(gateKey(gate)) ? 'self' : partnerGates.has(gateKey(gate)) ? 'partner' : 'composite']))
        }))
      });
    }
  }
  const status = bridgedRegionCount === 0 ? 'none' : bridgedRegionCount === regions.length - 1 ? 'complete' : 'partial';
  return { person, status, originalRegionCount: regions.length, bridgedRegionCount, regions, witnesses };
}

/** Derive complete channel and center topology directly from gates.all and CHANNELS. */
export function analyzeConnectionStructure(chartA, chartB) {
  const gatesA = chartGates(chartA), gatesB = chartGates(chartB);
  const union = new Set([...gatesA, ...gatesB]);
  const channelsA = CHANNELS.filter(channel => channel.gates.every(gate => gatesA.has(gateKey(gate))));
  const channelsB = CHANNELS.filter(channel => channel.gates.every(gate => gatesB.has(gateKey(gate))));
  const compositeChannels = CHANNELS.filter(channel => channel.gates.every(gate => union.has(gateKey(gate))));
  const centersA = new Set(channelsA.flatMap(channel => channel.centers));
  const centersB = new Set(channelsB.flatMap(channel => channel.centers));
  const compositeCenters = new Set(compositeChannels.flatMap(channel => channel.centers));
  const centerStates = centerNames.map(center => {
    const aDefined = centersA.has(center), bDefined = centersB.has(center), compositeDefined = compositeCenters.has(center);
    return {
      center, centerName: CENTERS[center].name,
      personA: aDefined ? 'defined' : hasGateInCenter(chartA, center) ? 'undefined' : 'open',
      personB: bDefined ? 'defined' : hasGateInCenter(chartB, center) ? 'undefined' : 'open',
      personADefined: aDefined, personBDefined: bDefined,
      personAHasGate: hasGateInCenter(chartA, center), personBHasGate: hasGateInCenter(chartB, center),
      compositeDefined, status: compositeDefined ? 'defined' : hasGateInCenter(chartA, center) || hasGateInCenter(chartB, center) ? 'undefined' : 'open',
      created: compositeDefined && !aDefined && !bDefined,
      channels: compositeChannels.filter(channel => channel.centers.includes(center)).map(channel => channelInfo(channel))
    };
  });
  const connections = { electromagnetic: [], companionship: [], compromise: [], dominance: [] };
  for (const channel of CHANNELS) {
    const [g1, g2] = channel.gates;
    const a1 = gatesA.has(gateKey(g1)), a2 = gatesA.has(gateKey(g2));
    const b1 = gatesB.has(gateKey(g1)), b2 = gatesB.has(gateKey(g2));
    const aFull = a1 && a2, bFull = b1 && b2;
    const info = channelInfo(channel);
    if (aFull && bFull) connections.companionship.push({ ...info, type: 'companionship' });
    else if (aFull && !(b1 || b2)) connections.dominance.push({ ...info, type: 'dominance', dominant: 'A' });
    else if (bFull && !(a1 || a2)) connections.dominance.push({ ...info, type: 'dominance', dominant: 'B' });
    else if (aFull && (b1 || b2)) connections.compromise.push({ ...info, type: 'compromise', dominant: 'A', partialGate: b1 ? g1 : g2 });
    else if (bFull && (a1 || a2)) connections.compromise.push({ ...info, type: 'compromise', dominant: 'B', partialGate: a1 ? g1 : g2 });
    else if ((a1 && b2 && !a2 && !b1) || (a2 && b1 && !a1 && !b2)) connections.electromagnetic.push({ ...info, type: 'electromagnetic', gateA: a1 ? g1 : g2, gateB: b1 ? g1 : g2 });
  }
  const components = componentsFor(compositeChannels);
  const ownComponentsA = componentsFor(channelsA), ownComponentsB = componentsFor(channelsB);
  const bridging = {
    personA: bridgingFor('A', gatesA, gatesB, compositeChannels, channelsA, components),
    personB: bridgingFor('B', gatesB, gatesA, compositeChannels, channelsB, components)
  };
  const channelClasses = Object.fromEntries(Object.entries(connections).map(([type, items]) => [type, items.map(item => item.channel)]));
  const summary = Object.fromEntries(Object.entries(connections).map(([type, items]) => [type, items.length]));
  summary.total = Object.values(summary).reduce((sum, count) => sum + count, 0);
  const createdChannels = compositeChannels.filter(channel => !channelsA.includes(channel) && !channelsB.includes(channel));
  return {
    individuals: {
      personA: { gates: [...gatesA].map(Number).sort((a,b)=>a-b), channels: channelsA.map(channel => channel.name), centers: centerNames.filter(center => centersA.has(center)), components: ownComponentsA },
      personB: { gates: [...gatesB].map(Number).sort((a,b)=>a-b), channels: channelsB.map(channel => channel.name), centers: centerNames.filter(center => centersB.has(center)), components: ownComponentsB }
    },
    composite: {
      gates: [...union].map(Number).sort((a,b)=>a-b), channels: compositeChannels.map(channel => channelInfo(channel)), centers: centerNames.filter(center => compositeCenters.has(center)), components,
      createdChannels: createdChannels.map(channel => channelInfo(channel)), channelCount: compositeChannels.length, createdChannelCount: createdChannels.length
    },
    centerStates, channelClasses, connections, summary,
    formulas: (() => {
      const definedCount = centerStates.filter(state => state.status === 'defined').length;
      const undefinedCount = centerStates.filter(state => state.status !== 'defined').length;
      const createdCenterCount = centerStates.filter(state => state.created).length;
      return {
        definedCount, undefinedCount, createdCenterCount,
        expression: `${definedCount}–${undefinedCount}`,
        createdCenters: centerStates.filter(state => state.created).map(state => state.center),
        createdChannels: createdChannels.map(channel => channelInfo(channel))
      };
    })(),
    bridging,
    sources: { individuals: 'chart.gates.all', completeChannels: 'CHANNELS', centerMembership: 'GATES[gate].center', topology: 'CHANNELS.centers' }
  };
}

export default analyzeConnectionStructure;
