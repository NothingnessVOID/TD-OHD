// TD-OHD local structural analysis. Source attribution and MIT terms: THIRD_PARTY_NOTICES.md.
// See THIRD_PARTY_NOTICES.md. No astronomical position calculation occurs here.
import { GATES, CHANNELS, CENTERS } from './catalog.js';

// Type interaction dynamics matrix
const TYPE_DYNAMICS = {
  'generator-generator': {
    dynamic: 'Powerful work partnership',
    gifts: 'Sustainable energy, mutual response, deep satisfaction potential',
    challenges: 'May get stuck in routines, need external stimulation',
    tips: 'Take turns initiating topics to respond to'
  },
  'generator-manifestingGenerator': {
    dynamic: 'High-energy partnership',
    gifts: 'Combined stamina and speed, complementary work styles',
    challenges: 'MG may move too fast for Generator',
    tips: 'MG should inform before changing direction'
  },
  'generator-projector': {
    dynamic: 'Classic guidance relationship',
    gifts: 'Projector sees and guides Generator\'s energy, mutual recognition',
    challenges: 'Projector may feel overlooked, Generator may feel managed',
    tips: 'Generator invites Projector\'s guidance, Projector waits for invitation'
  },
  'generator-manifestor': {
    dynamic: 'Initiator-sustainer dynamic',
    gifts: 'Manifestor sparks, Generator builds and sustains',
    challenges: 'Manifestor may feel slowed, Generator may feel pushed',
    tips: 'Manifestor informs, Generator responds authentically'
  },
  'generator-reflector': {
    dynamic: 'Energy source meets mirror',
    gifts: 'Reflector samples Generator\'s healthy energy, provides wisdom',
    challenges: 'Reflector needs space from constant energy',
    tips: 'Reflector gives feedback after lunar cycle observation'
  },
  'manifestingGenerator-manifestingGenerator': {
    dynamic: 'Multi-passionate duo',
    gifts: 'Fast-paced, adaptable, exciting adventures together',
    challenges: 'May skip steps together, scattered energy',
    tips: 'Build in response time before major decisions'
  },
  'manifestingGenerator-projector': {
    dynamic: 'Speed meets depth',
    gifts: 'Projector helps MG focus energy efficiently',
    challenges: 'MG may overwhelm Projector, Projector may slow MG down',
    tips: 'MG invites guidance, Projector rests and observes'
  },
  'manifestingGenerator-manifestor': {
    dynamic: 'Dual initiator energy',
    gifts: 'Both can make things happen quickly',
    challenges: 'Power struggles, competing for initiative',
    tips: 'Define domains, inform each other before acting'
  },
  'manifestingGenerator-reflector': {
    dynamic: 'Fast meets reflective',
    gifts: 'MG brings action, Reflector brings perspective',
    challenges: 'Very different rhythms, Reflector needs time',
    tips: 'MG slows down, Reflector gets full lunar cycles'
  },
  'projector-projector': {
    dynamic: 'Mutual recognition',
    gifts: 'Deep seeing of each other, efficient together',
    challenges: 'Both need outside energy, may over-guide each other',
    tips: 'Take turns being guided, rest together'
  },
  'projector-manifestor': {
    dynamic: 'Guide meets initiator',
    gifts: 'Projector sees Manifestor\'s impact clearly',
    challenges: 'Manifestor may not wait for guidance, Projector may feel bypassed',
    tips: 'Manifestor invites Projector\'s input before initiating'
  },
  'projector-reflector': {
    dynamic: 'Seer meets mirror',
    gifts: 'Deep wisdom together, non-energy types understand each other',
    challenges: 'Neither has sustained energy, need outside sources',
    tips: 'Work in bursts, honor rest needs'
  },
  'manifestor-manifestor': {
    dynamic: 'Double initiator',
    gifts: 'Major creative power, can catalyze big changes',
    challenges: 'Power struggles, both want to lead',
    tips: 'Define separate domains, inform thoroughly'
  },
  'manifestor-reflector': {
    dynamic: 'Impact meets reflection',
    gifts: 'Reflector mirrors Manifestor\'s true impact',
    challenges: 'Manifestor may overwhelm, Reflector needs processing time',
    tips: 'Manifestor informs, Reflector gives lunar-cycle feedback'
  },
  'reflector-reflector': {
    dynamic: 'Rare mirror connection',
    gifts: 'Deep understanding of each other\'s openness',
    challenges: 'Both highly sensitive to environment, may amplify issues',
    tips: 'Create nurturing environment together, honor lunar rhythms'
  }
};

// Profile compatibility patterns
const PROFILE_HARMONY = {
  // Same line in personal (first) number tends to create understanding
  sameLine1: 0.7,
  // Complementary lines (1-4, 2-5, 3-6) create attraction
  complementary: 0.8,
  // Same profile = recognition but similar challenges
  sameProfile: 0.75,
  // Default moderate compatibility
  default: 0.6
};

/**
 * Get type interaction key (normalized to consistent order)
 */
function getTypeKey(type1, type2) {
  const order = ['generator', 'manifestingGenerator', 'projector', 'manifestor', 'reflector'];
  const key1 = type1.toLowerCase().replace(/\s+/g, '').replace('manifesting', 'manifesting');
  const key2 = type2.toLowerCase().replace(/\s+/g, '').replace('manifesting', 'manifesting');

  // Normalize type names
  const normalize = (t) => {
    if (t.includes('manifesting') && t.includes('generator')) return 'manifestingGenerator';
    if (t === 'generator') return 'generator';
    if (t === 'projector') return 'projector';
    if (t === 'manifestor') return 'manifestor';
    if (t === 'reflector') return 'reflector';
    return t;
  };

  const t1 = normalize(key1);
  const t2 = normalize(key2);

  // Put in consistent order
  if (order.indexOf(t1) <= order.indexOf(t2)) {
    return `${t1}-${t2}`;
  }
  return `${t2}-${t1}`;
}

/**
 * Analyze type interaction between two charts
 */
function analyzeTypeInteraction(chartA, chartB) {
  const typeA = chartA.type?.name || 'Generator';
  const typeB = chartB.type?.name || 'Generator';

  const key = getTypeKey(typeA, typeB);
  const dynamic = TYPE_DYNAMICS[key] || {
    dynamic: 'Unique combination',
    gifts: 'Opportunity for growth and understanding',
    challenges: 'Different operating styles',
    tips: 'Honor each other\'s strategy'
  };

  return {
    typeA,
    typeB,
    ...dynamic
  };
}

/**
 * Analyze authority dynamics
 */
function analyzeAuthorityDynamic(chartA, chartB) {
  const authA = chartA.authority?.name || 'Sacral Authority';
  const authB = chartB.authority?.name || 'Sacral Authority';

  // Timing considerations based on authority types
  let timing = 'Standard';
  let description = '';

  const emotional = 'Emotional Authority';
  const lunar = 'Lunar Authority';

  if (authA === emotional || authB === emotional) {
    timing = 'Extended';
    description = 'One or both need emotional wave clarity - allow time for decisions';
  } else if (authA === lunar || authB === lunar) {
    timing = 'Lunar cycle';
    description = 'Major decisions benefit from 28-day observation period';
  } else if (authA === authB) {
    timing = 'Aligned';
    description = `Both use ${authA} - natural understanding of decision process`;
  } else {
    description = `Different decision styles: ${authA} meets ${authB}. Honor both processes.`;
  }

  return {
    authorityA: authA,
    authorityB: authB,
    timing,
    description
  };
}

/**
 * Analyze profile harmony
 */
function analyzeProfileHarmony(chartA, chartB) {
  const profileA = chartA.profile?.numbers || '1/3';
  const profileB = chartB.profile?.numbers || '1/3';

  const [line1A, line2A] = profileA.split('/').map(Number);
  const [line1B, line2B] = profileB.split('/').map(Number);

  let harmony = PROFILE_HARMONY.default;
  let description = '';

  // Same profile
  if (profileA === profileB) {
    harmony = PROFILE_HARMONY.sameProfile;
    description = `Both ${profileA} - deep mutual recognition but share similar challenges`;
  }
  // Same first line (personal role)
  else if (line1A === line1B) {
    harmony = PROFILE_HARMONY.sameLine1;
    description = `Both lead with Line ${line1A} energy - natural understanding of each other's approach`;
  }
  // Complementary lines (1↔4, 2↔5, 3↔6)
  else if (
    (line1A === 1 && line1B === 4) || (line1A === 4 && line1B === 1) ||
    (line1A === 2 && line1B === 5) || (line1A === 5 && line1B === 2) ||
    (line1A === 3 && line1B === 6) || (line1A === 6 && line1B === 3)
  ) {
    harmony = PROFILE_HARMONY.complementary;
    description = `Lines ${line1A} and ${line1B} are complementary - attractive polarity`;
  }
  else {
    description = `${profileA} and ${profileB} bring different gifts - opportunity for growth`;
  }

  return {
    profileA,
    profileB,
    nameA: chartA.profile?.name || profileA,
    nameB: chartB.profile?.name || profileB,
    harmony,
    description
  };
}

/**
 * Find electromagnetic pairs (channel completions)
 * When Person A has one gate of a channel and Person B has the other
 */
function findElectromagneticPairs(chartA, chartB) {
  const gatesA = new Set(chartA.gates?.all || []);
  const gatesB = new Set(chartB.gates?.all || []);

  const electromagnetic = [];

  for (const channel of CHANNELS) {
    const [gate1, gate2] = channel.gates;

    // Check if A has gate1 and B has gate2
    if (gatesA.has(gate1) && gatesB.has(gate2) && !gatesA.has(gate2) && !gatesB.has(gate1)) {
      electromagnetic.push({
        gateA: gate1,
        gateB: gate2,
        channel: channel.name,
        centers: channel.centers,
        theme: channel.theme,
        attraction: 'A provides Gate ' + gate1 + ', B provides Gate ' + gate2
      });
    }
    // Check reverse: A has gate2 and B has gate1
    else if (gatesA.has(gate2) && gatesB.has(gate1) && !gatesA.has(gate1) && !gatesB.has(gate2)) {
      electromagnetic.push({
        gateA: gate2,
        gateB: gate1,
        channel: channel.name,
        centers: channel.centers,
        theme: channel.theme,
        attraction: 'A provides Gate ' + gate2 + ', B provides Gate ' + gate1
      });
    }
  }

  return electromagnetic;
}

/**
 * Find shared gates between two charts
 */
function findSharedGates(chartA, chartB) {
  const gatesA = new Set(chartA.gates?.all || []);
  const gatesB = new Set(chartB.gates?.all || []);

  const shared = [];
  for (const gate of gatesA) {
    if (gatesB.has(gate)) {
      shared.push({
        gate,
        name: GATES[gate]?.name || `Gate ${gate}`,
        center: GATES[gate]?.center,
        theme: GATES[gate]?.theme
      });
    }
  }

  return shared;
}

/**
 * Find shared channels (both have the complete channel)
 */
function findSharedChannels(chartA, chartB) {
  const channelsA = chartA.channels || [];
  const channelsB = chartB.channels || [];

  const channelNamesA = new Set(channelsA.map(c => c.name));

  return channelsB.filter(c => channelNamesA.has(c.name));
}

/**
 * Analyze center dynamics (defined meets undefined)
 */
function analyzeCenterDynamics(chartA, chartB) {
  const definedA = new Set(chartA.centers?.definedNames || []);
  const definedB = new Set(chartB.centers?.definedNames || []);

  const dynamics = [];

  for (const centerName of Object.keys(CENTERS)) {
    const aHas = definedA.has(centerName);
    const bHas = definedB.has(centerName);

    let dynamic = '';
    let description = '';

    if (aHas && bHas) {
      dynamic = 'Both Defined';
      description = `Both have defined ${CENTERS[centerName].name} - consistent but fixed expression`;
    } else if (!aHas && !bHas) {
      dynamic = 'Both Open';
      description = `Both have open ${CENTERS[centerName].name} - amplified together from environment`;
    } else if (aHas && !bHas) {
      dynamic = 'A Conditions B';
      description = `A's defined ${CENTERS[centerName].name} conditions B's open center`;
    } else {
      dynamic = 'B Conditions A';
      description = `B's defined ${CENTERS[centerName].name} conditions A's open center`;
    }

    dynamics.push({
      center: centerName,
      centerName: CENTERS[centerName].name,
      theme: CENTERS[centerName].theme,
      personADefined: aHas,
      personBDefined: bHas,
      dynamic,
      description
    });
  }

  return dynamics;
}

/**
 * Analyze bridging potential
 * When together, they may complete channels neither has alone
 */
function analyzeBridging(chartA, chartB, electromagnetic) {
  const bridgedChannels = electromagnetic.map(e => ({
    channel: e.channel,
    theme: e.theme
  }));

  let description = '';
  if (bridgedChannels.length === 0) {
    description = 'No bridging channels - relationship has other forms of connection';
  } else if (bridgedChannels.length <= 2) {
    description = 'Light bridging - some electromagnetic attraction through shared channels';
  } else if (bridgedChannels.length <= 5) {
    description = 'Significant bridging - strong electromagnetic pull when together';
  } else {
    description = 'Intense bridging - powerful connection with many completed channels together';
  }

  return {
    description,
    bridgedChannels,
    count: bridgedChannels.length
  };
}

/**
 * Complete Connection Chart Analysis
 * Classifies every channel into one of four relationship types:
 * - Electromagnetic: Each partner has one gate, completing the channel together
 * - Companionship: Both partners have the full channel defined
 * - Compromise: One has the full channel, other has one gate of it
 * - Dominance: One has the full channel, other has nothing in it
 */
function analyzeConnectionChart(chartA, chartB) {
  const gatesA = new Set(chartA.gates?.all || []);
  const gatesB = new Set(chartB.gates?.all || []);
  const channelNamesA = new Set((chartA.channels || []).map(c => c.name));
  const channelNamesB = new Set((chartB.channels || []).map(c => c.name));

  const connections = {
    electromagnetic: [],
    companionship: [],
    compromise: [],
    dominance: []
  };

  for (const channel of CHANNELS) {
    const [gate1, gate2] = channel.gates;
    const aHas1 = gatesA.has(gate1), aHas2 = gatesA.has(gate2);
    const bHas1 = gatesB.has(gate1), bHas2 = gatesB.has(gate2);
    const aHasChannel = aHas1 && aHas2;
    const bHasChannel = bHas1 && bHas2;

    const info = {
      channel: channel.name,
      gates: channel.gates,
      centers: channel.centers,
      theme: channel.theme,
      circuit: channel.circuit
    };

    if (aHasChannel && bHasChannel) {
      // Companionship: both have the full channel
      connections.companionship.push({
        ...info,
        type: 'companionship',
        description: `Both share the ${channel.name} channel — mutual understanding and ease in this energy.`
      });
    } else if (aHasChannel && !bHas1 && !bHas2) {
      // Dominance: A has full channel, B has nothing
      connections.dominance.push({
        ...info,
        type: 'dominance',
        dominant: 'A',
        description: `A's ${channel.name} channel conditions B, who has no gates in this channel.`
      });
    } else if (bHasChannel && !aHas1 && !aHas2) {
      // Dominance: B has full channel, A has nothing
      connections.dominance.push({
        ...info,
        type: 'dominance',
        dominant: 'B',
        description: `B's ${channel.name} channel conditions A, who has no gates in this channel.`
      });
    } else if (aHasChannel && (bHas1 || bHas2)) {
      // Compromise: A has full channel, B has one gate
      const bGate = bHas1 ? gate1 : gate2;
      connections.compromise.push({
        ...info,
        type: 'compromise',
        dominant: 'A',
        partialGate: bGate,
        description: `A defines the ${channel.name} channel fully; B has Gate ${bGate} and gets pulled into A's frequency.`
      });
    } else if (bHasChannel && (aHas1 || aHas2)) {
      // Compromise: B has full channel, A has one gate
      const aGate = aHas1 ? gate1 : gate2;
      connections.compromise.push({
        ...info,
        type: 'compromise',
        dominant: 'B',
        partialGate: aGate,
        description: `B defines the ${channel.name} channel fully; A has Gate ${aGate} and gets pulled into B's frequency.`
      });
    } else if ((aHas1 && bHas2 && !aHas2 && !bHas1) || (aHas2 && bHas1 && !aHas1 && !bHas2)) {
      // Electromagnetic: each has one gate, completing the channel together
      const gateA = aHas1 ? gate1 : gate2;
      const gateB = bHas1 ? gate1 : gate2;
      connections.electromagnetic.push({
        ...info,
        type: 'electromagnetic',
        gateA,
        gateB,
        description: `A's Gate ${gateA} meets B's Gate ${gateB}, creating the ${channel.name} channel together — new energy neither has alone.`
      });
    }
  }

  // Calculate composite type
  const compositeGates = new Set([...gatesA, ...gatesB]);
  const compositeChannels = CHANNELS.filter(ch =>
    compositeGates.has(ch.gates[0]) && compositeGates.has(ch.gates[1])
  );
  const compositeCenters = new Set();
  compositeChannels.forEach(ch => ch.centers.forEach(c => compositeCenters.add(c)));

  const hasSacral = compositeCenters.has('sacral');
  const compositeMotorToThroat = checkCompositeMotorToThroat(compositeChannels);

  let compositeType = 'Projector';
  if (!hasSacral && compositeMotorToThroat) compositeType = 'Manifestor';
  else if (hasSacral && compositeMotorToThroat) compositeType = 'Manifesting Generator';
  else if (hasSacral) compositeType = 'Generator';
  else if (compositeCenters.size === 0) compositeType = 'Reflector';

  return {
    connections,
    compositeType,
    compositeChannelCount: compositeChannels.length,
    compositeCenters: Array.from(compositeCenters),
    summary: {
      electromagnetic: connections.electromagnetic.length,
      companionship: connections.companionship.length,
      compromise: connections.compromise.length,
      dominance: connections.dominance.length,
      total: connections.electromagnetic.length + connections.companionship.length +
             connections.compromise.length + connections.dominance.length
    }
  };
}

function checkCompositeMotorToThroat(channels) {
  const motorCenters = ['sacral', 'heart', 'solar', 'root'];
  const connections = new Map();
  channels.forEach(ch => {
    const [c1, c2] = ch.centers;
    if (!connections.has(c1)) connections.set(c1, new Set());
    if (!connections.has(c2)) connections.set(c2, new Set());
    connections.get(c1).add(c2);
    connections.get(c2).add(c1);
  });
  if (!connections.has('throat')) return false;
  const visited = new Set(['throat']);
  const queue = ['throat'];
  while (queue.length > 0) {
    const current = queue.shift();
    if (motorCenters.includes(current)) return true;
    for (const neighbor of (connections.get(current) || [])) {
      if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
    }
  }
  return false;
}

/**
 * Generate summary text
 */
function generateSummary(typeInteraction, profileHarmony, electromagnetic, sharedGates, sharedChannels) {
  const parts = [];

  // Type dynamic
  parts.push(`${typeInteraction.typeA} + ${typeInteraction.typeB}: ${typeInteraction.dynamic}.`);

  // Profile
  if (profileHarmony.harmony >= 0.75) {
    parts.push(`Profiles ${profileHarmony.profileA} and ${profileHarmony.profileB} have natural harmony.`);
  }

  // Electromagnetic
  if (electromagnetic.length > 0) {
    parts.push(`${electromagnetic.length} electromagnetic connection${electromagnetic.length > 1 ? 's' : ''} create attraction.`);
  }

  // Shared elements
  if (sharedChannels.length > 0) {
    parts.push(`${sharedChannels.length} shared channel${sharedChannels.length > 1 ? 's' : ''} create deep understanding.`);
  }

  return parts.join(' ');
}

/**
 * Main comparison function
 * @param {Object} chartA - First person's Human Design chart
 * @param {Object} chartB - Second person's Human Design chart
 * @returns {Object} Compatibility analysis
 */
export function compareHumanDesign(chartA, chartB) {
  // Type interaction
  const typeInteraction = analyzeTypeInteraction(chartA, chartB);

  // Authority dynamics
  const authorityDynamic = analyzeAuthorityDynamic(chartA, chartB);

  // Profile harmony
  const profileHarmony = analyzeProfileHarmony(chartA, chartB);

  // Electromagnetic pairs (channel completions)
  const electromagneticPairs = findElectromagneticPairs(chartA, chartB);

  // Shared gates
  const sharedGates = findSharedGates(chartA, chartB);

  // Shared channels
  const sharedChannels = findSharedChannels(chartA, chartB);

  // Center dynamics
  const centerDynamics = analyzeCenterDynamics(chartA, chartB);

  // Bridging analysis
  const bridging = analyzeBridging(chartA, chartB, electromagneticPairs);

  // Full connection chart (all 4 types)
  const connectionChart = analyzeConnectionChart(chartA, chartB);

  // Summary
  const summary = generateSummary(typeInteraction, profileHarmony, electromagneticPairs, sharedGates, sharedChannels);

  return {
    typeInteraction,
    authorityDynamic,
    profileHarmony,
    electromagneticPairs,
    sharedGates,
    sharedChannels,
    centerDynamics,
    bridging,
    connectionChart,
    summary,

    // Quick stats
    stats: {
      electromagneticCount: electromagneticPairs.length,
      companionshipCount: connectionChart.summary.companionship,
      compromiseCount: connectionChart.summary.compromise,
      dominanceCount: connectionChart.summary.dominance,
      sharedGatesCount: sharedGates.length,
      sharedChannelsCount: sharedChannels.length,
      compositeType: connectionChart.compositeType,
      conditioningCenters: centerDynamics.filter(d =>
        d.dynamic === 'A Conditions B' || d.dynamic === 'B Conditions A'
      ).length
    }
  };
}

export default compareHumanDesign;
