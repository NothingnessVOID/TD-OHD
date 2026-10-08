import { CHANNELS, GATES, CENTERS } from './catalog.js';
import { typeFacts } from './identities.js';
import { analyzeConnectionStructure } from './connection-structure.js';

function findElectromagneticPairs(structure) {
  return structure.connections.electromagnetic.map(item => ({
    gateA: item.gateA, gateB: item.gateB, channel: item.channel,
    centers: item.centers, theme: item.theme,
    source: { gates: 'chart.gates.all', channels: 'CHANNELS' }
  }));
}

function findSharedGates(chartA, chartB) {
  const gatesB = new Set((chartB?.gates?.all || []).map(Number));
  return [...new Set((chartA?.gates?.all || []).map(Number))].filter(gate => gatesB.has(gate)).sort((a, b) => a - b).map(gate => ({
    gate, name: GATES[gate]?.name || `Gate ${gate}`, center: GATES[gate]?.center, theme: GATES[gate]?.theme
  }));
}

function individualFacts(chart) {
  const typeId = chart?.type?.id || chart?.calculation?.type?.id;
  return {
    type: chart?.type?.name || null,
    strategy: chart?.strategy?.name || chart?.strategy || chart?.type?.strategy?.name || chart?.type?.strategy || typeFacts[typeId]?.strategy || null,
    authority: chart?.authority?.name || null,
    profile: chart?.profile?.numbers || chart?.calculation?.profile?.id || null,
    definition: chart?.definition?.name || chart?.definition || null
  };
}

function compositeTypeFor(channels, centers) {
  const adjacency = new Map();
  for (const channel of channels) {
    const [a, b] = channel.centers;
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a).add(b);
    adjacency.get(b).add(a);
  }
  const motors = ['sacral', 'heart', 'solar', 'root'];
  const queue = ['throat'];
  const seen = new Set(queue);
  let motorToThroat = false;
  while (queue.length) {
    const current = queue.shift();
    if (motors.includes(current)) motorToThroat = true;
    for (const next of adjacency.get(current) || []) if (!seen.has(next)) { seen.add(next); queue.push(next); }
  }
  const hasSacral = centers.includes('sacral');
  if (!hasSacral && motorToThroat) return 'Manifestor';
  if (hasSacral && motorToThroat) return 'Manifesting Generator';
  if (hasSacral) return 'Generator';
  if (!centers.length) return 'Reflector';
  return 'Projector';
}

/** Compare two charts using structural topology; prose and interpretation are left to the UI. */
export function compareHumanDesign(chartA, chartB) {
  const structure = analyzeConnectionStructure(chartA, chartB);
  const sharedGates = findSharedGates(chartA, chartB);
  const sharedChannelNames = new Set(structure.channelClasses.companionship);
  const channelsByName = new Map(CHANNELS.map(channel => [channel.name, channel]));
  const sharedChannels = [...sharedChannelNames].map(name => ({
    name,
    gates: [...channelsByName.get(name).gates],
    centers: [...channelsByName.get(name).centers],
    theme: channelsByName.get(name).theme,
    circuit: channelsByName.get(name).circuit
  }));
  const electromagneticPairs = findElectromagneticPairs(structure);
  const centerDynamics = structure.centerStates.map(state => ({
    ...state,
    theme: CENTERS[state.center]?.theme,
    dynamic: state.personA === 'defined' && state.personB === 'defined' ? 'both-defined'
      : state.personA === 'open' && state.personB === 'open' ? 'both-open'
      : state.personA === 'defined' ? 'a-defined-b-undefined'
      : state.personB === 'defined' ? 'b-defined-a-undefined' : 'neither-defined'
  }));
  const summaryFacts = {
    electromagneticCount: electromagneticPairs.length,
    sharedGateCount: sharedGates.length,
    sharedChannelCount: sharedChannels.length,
    createdChannelCount: structure.composite.createdChannelCount,
    formula: structure.formulas.expression,
    definedCenterCount: structure.formulas.definedCount,
    undefinedCenterCount: structure.formulas.undefinedCount,
    createdCenterCount: structure.formulas.createdCenterCount,
    bridgeStatusA: structure.bridging.personA.status,
    bridgeStatusB: structure.bridging.personB.status
  };
  return {
    individuals: { personA: individualFacts(chartA), personB: individualFacts(chartB) },
    structure,
    typeInteraction: { typeA: individualFacts(chartA).type, typeB: individualFacts(chartB).type },
    authorityDynamic: { authorityA: individualFacts(chartA).authority, authorityB: individualFacts(chartB).authority },
    electromagneticPairs,
    sharedGates,
    sharedChannels,
    centerDynamics,
    bridging: structure.bridging,
    connectionChart: {
      connections: structure.connections,
      compositeType: compositeTypeFor(structure.composite.channels, structure.composite.centers),
      compositeChannelCount: structure.composite.channelCount,
      compositeCenters: [...structure.composite.centers],
      compositeComponents: structure.composite.components,
      summary: { ...structure.summary }
    },
    summaryFacts,
    summary: `Nine-center formula ${summaryFacts.formula}; ${summaryFacts.createdCenterCount} Created centers; ${summaryFacts.electromagneticCount} electromagnetic channels; A bridging: ${summaryFacts.bridgeStatusA}; B bridging: ${summaryFacts.bridgeStatusB}.`,
    stats: {
      electromagneticCount: electromagneticPairs.length,
      createdChannelCount: structure.composite.createdChannelCount,
      companionshipCount: structure.summary.companionship,
      compromiseCount: structure.summary.compromise,
      dominanceCount: structure.summary.dominance,
      sharedGatesCount: sharedGates.length,
      sharedChannelsCount: sharedChannels.length,
      compositeChannelCount: structure.composite.channelCount,
      definedCenterCount: structure.formulas.definedCount,
      undefinedCenterCount: structure.formulas.undefinedCount,
      createdCenterCount: structure.formulas.createdCenterCount,
      conditioningCenters: centerDynamics.filter(center => center.personADefined !== center.personBDefined).length
    }
  };
}

export default compareHumanDesign;
