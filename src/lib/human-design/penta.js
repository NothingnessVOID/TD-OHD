// TD-OHD local structural analysis. Source attribution and MIT terms: THIRD_PARTY_NOTICES.md.
// See THIRD_PARTY_NOTICES.md. No astronomical position calculation occurs here.
import { GATES, CHANNELS, CENTERS } from './catalog.js';

// BG5 Career Types mapped from HD Types
const CAREER_TYPES = {
  'Manifestor': 'Initiator',
  'Generator': 'Classic Builder',
  'Manifesting Generator': 'Express Builder',
  'Projector': 'Advisor',
  'Reflector': 'Evaluator'
};

// Penta roles based on center definition patterns
const PENTA_ROLES = {
  throat_defined: {
    role: 'Communicator',
    description: 'Brings voice and manifestation to the group. Can articulate and act on group decisions.'
  },
  sacral_defined: {
    role: 'Worker',
    description: 'Provides sustainable life force energy for the group\'s work. The engine of productivity.'
  },
  heart_defined: {
    role: 'Director',
    description: 'Provides willpower and material direction. Can make promises on behalf of the group.'
  },
  g_defined: {
    role: 'Guide',
    description: 'Holds the group\'s identity and direction. Provides love and sense of purpose.'
  },
  solar_defined: {
    role: 'Emotional Navigator',
    description: 'Brings emotional depth and awareness. Helps the group navigate feelings and timing.'
  },
  spleen_defined: {
    role: 'Health Monitor',
    description: 'Provides intuitive awareness and survival instincts. Keeps the group healthy and safe.'
  },
  head_defined: {
    role: 'Inspirer',
    description: 'Brings mental pressure and inspiration. Generates questions that drive the group forward.'
  },
  ajna_defined: {
    role: 'Conceptualizer',
    description: 'Processes and conceptualizes ideas for the group. Provides mental frameworks.'
  },
  root_defined: {
    role: 'Driver',
    description: 'Brings pressure and momentum. Keeps the group moving and under productive stress.'
  }
};

/**
 * Analyze a group of 3-5 Human Design charts
 * @param {Array<Object>} charts - Array of HD chart objects from calculateHumanDesign()
 * @param {Array<string>} names - Optional array of names for each person
 * @returns {Object} Penta analysis
 */
export function analyzePenta(charts, names = []) {
  if (charts.length < 2) {
    throw new Error('Penta analysis requires at least 2 charts (optimal: 3-5)');
  }
  if (charts.length > 9) {
    throw new Error('Penta analysis supports up to 9 charts (3-5 is optimal for Penta, 6-9 extends to WA dynamics)');
  }

  const memberCount = charts.length;
  const isPenta = memberCount >= 3 && memberCount <= 5;

  // Build member profiles
  const members = charts.map((chart, i) => ({
    name: names[i] || `Person ${i + 1}`,
    type: chart.type?.name,
    careerType: CAREER_TYPES[chart.type?.name] || 'Unknown',
    authority: chart.authority?.name,
    profile: chart.profile?.numbers,
    definedCenters: chart.centers?.definedNames || [],
    gates: new Set(chart.gates?.all || []),
    channels: chart.channels || [],
    definition: chart.definition
  }));

  // Combined group analysis
  const allGates = new Set();
  const allDefinedCenters = new Set();
  members.forEach(m => {
    m.gates.forEach(g => allGates.add(g));
    m.definedCenters.forEach(c => allDefinedCenters.add(c));
  });

  // Group channels
  const groupChannels = CHANNELS.filter(ch =>
    allGates.has(ch.gates[0]) && allGates.has(ch.gates[1])
  );

  // Group defined centers from channels
  const groupCentersFromChannels = new Set();
  groupChannels.forEach(ch => ch.centers.forEach(c => groupCentersFromChannels.add(c)));

  // Group type determination
  const hasSacral = groupCentersFromChannels.has('sacral');
  const hasMotorToThroat = checkGroupMotorToThroat(groupChannels);
  let groupType = 'Projector';
  if (!hasSacral && hasMotorToThroat) groupType = 'Manifestor';
  else if (hasSacral && hasMotorToThroat) groupType = 'Manifesting Generator';
  else if (hasSacral) groupType = 'Generator';
  else if (groupCentersFromChannels.size === 0) groupType = 'Reflector';

  // Role analysis
  const roles = {};
  const filledRoles = [];
  const missingRoles = [];

  for (const [centerKey, roleInfo] of Object.entries(PENTA_ROLES)) {
    const center = centerKey.replace('_defined', '');
    const contributors = members.filter(m => m.definedCenters.includes(center));

    if (contributors.length > 0) {
      filledRoles.push({
        center,
        ...roleInfo,
        contributors: contributors.map(c => c.name),
        strength: contributors.length > 1 ? 'strong' : 'moderate'
      });
    } else {
      missingRoles.push({
        center,
        ...roleInfo,
        suggestion: `Consider adding someone with a defined ${CENTERS[center]?.name || center} to fill this role.`
      });
    }
    roles[center] = {
      ...roleInfo,
      filled: contributors.length > 0,
      contributors: contributors.map(c => c.name),
      count: contributors.length
    };
  }

  // Electromagnetic connections within the group
  const groupElectromagnetics = findGroupElectromagnetics(members);

  // Circuit balance
  const circuitBalance = { individual: 0, tribal: 0, collective: 0, integration: 0 };
  groupChannels.forEach(ch => {
    if (ch.circuit && circuitBalance[ch.circuit] !== undefined) {
      circuitBalance[ch.circuit]++;
    }
  });

  // Career type distribution
  const careerTypeDistribution = {};
  members.forEach(m => {
    careerTypeDistribution[m.careerType] = (careerTypeDistribution[m.careerType] || 0) + 1;
  });

  // Shared gates (gates that multiple people have)
  const gateFrequency = {};
  members.forEach(m => {
    m.gates.forEach(g => {
      gateFrequency[g] = (gateFrequency[g] || 0) + 1;
    });
  });
  const sharedGates = Object.entries(gateFrequency)
    .filter(([, count]) => count > 1)
    .map(([gate, count]) => ({
      gate: parseInt(gate),
      name: GATES[parseInt(gate)]?.name,
      center: GATES[parseInt(gate)]?.center,
      sharedBy: count,
      members: members.filter(m => m.gates.has(parseInt(gate))).map(m => m.name)
    }))
    .sort((a, b) => b.sharedBy - a.sharedBy);

  // Missing centers (no one in the group has them defined)
  const undefinedForAll = Object.keys(CENTERS).filter(c => !allDefinedCenters.has(c));

  // Recommendations
  const recommendations = generateRecommendations(
    groupType, filledRoles, missingRoles, circuitBalance,
    careerTypeDistribution, undefinedForAll, memberCount
  );

  return {
    memberCount,
    isPenta,
    groupType,
    groupCareerType: CAREER_TYPES[groupType] || groupType,
    members: members.map(m => ({
      name: m.name,
      type: m.type,
      careerType: m.careerType,
      authority: m.authority,
      profile: m.profile,
      definedCenters: m.definedCenters
    })),
    roles,
    filledRoles,
    missingRoles,
    groupChannels: groupChannels.map(ch => ({
      name: ch.name,
      gates: ch.gates,
      theme: ch.theme,
      circuit: ch.circuit
    })),
    groupCenters: Array.from(groupCentersFromChannels),
    undefinedForAll,
    electromagnetics: groupElectromagnetics,
    circuitBalance,
    careerTypeDistribution,
    sharedGates,
    recommendations,
    stats: {
      totalChannels: groupChannels.length,
      totalDefinedCenters: groupCentersFromChannels.size,
      filledRoleCount: filledRoles.length,
      missingRoleCount: missingRoles.length,
      electromagneticCount: groupElectromagnetics.length,
      sharedGateCount: sharedGates.length
    }
  };
}

/**
 * Find electromagnetic connections within the group
 * (Person A has one gate of a channel, Person B has the other)
 */
function findGroupElectromagnetics(members) {
  const electromagnetics = [];

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i];
      const b = members[j];

      for (const channel of CHANNELS) {
        const [gate1, gate2] = channel.gates;
        if ((a.gates.has(gate1) && b.gates.has(gate2) && !a.gates.has(gate2) && !b.gates.has(gate1)) ||
            (a.gates.has(gate2) && b.gates.has(gate1) && !a.gates.has(gate1) && !b.gates.has(gate2))) {
          electromagnetics.push({
            personA: a.name,
            personB: b.name,
            channel: channel.name,
            gates: channel.gates,
            theme: channel.theme
          });
        }
      }
    }
  }

  return electromagnetics;
}

function checkGroupMotorToThroat(channels) {
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

function generateRecommendations(groupType, filledRoles, missingRoles, circuitBalance, careerTypes, undefinedCenters, memberCount) {
  const recs = [];

  // Group type insight
  recs.push({
    category: 'Group Energy',
    insight: `This group functions as a ${groupType}. ${
      groupType === 'Generator' ? 'The group has sustainable work energy but needs to respond to opportunities rather than initiate.' :
      groupType === 'Manifesting Generator' ? 'The group can both initiate and sustain work, with quick adaptability.' :
      groupType === 'Manifestor' ? 'The group has initiating power. It should inform stakeholders before taking action.' :
      groupType === 'Projector' ? 'The group excels at guidance and management. It should wait for recognition and invitations.' :
      'The group mirrors its environment. Major decisions benefit from a full lunar cycle of reflection.'
    }`
  });

  // Missing roles
  if (missingRoles.length > 0) {
    const critical = missingRoles.filter(r =>
      ['throat', 'sacral', 'g'].includes(r.center)
    );
    if (critical.length > 0) {
      recs.push({
        category: 'Critical Gaps',
        insight: `Missing key roles: ${critical.map(r => `${r.role} (${CENTERS[r.center]?.name})`).join(', ')}. These gaps may cause the group to struggle with ${
          critical.some(r => r.center === 'throat') ? 'communication and manifestation' :
          critical.some(r => r.center === 'sacral') ? 'sustained work energy' :
          'direction and identity'
        }.`
      });
    }
  }

  // Circuit balance
  const totalCircuits = Object.values(circuitBalance).reduce((a, b) => a + b, 0);
  if (totalCircuits > 0) {
    const dominant = Object.entries(circuitBalance).sort((a, b) => b[1] - a[1])[0];
    if (dominant[1] > totalCircuits * 0.5) {
      recs.push({
        category: 'Circuit Balance',
        insight: `The group energy is heavily ${dominant[0]} (${dominant[1]}/${totalCircuits} channels). ${
          dominant[0] === 'individual' ? 'Strong individual creativity but may struggle with teamwork norms.' :
          dominant[0] === 'tribal' ? 'Strong loyalty and support but may resist outside perspectives.' :
          dominant[0] === 'collective' ? 'Good at sharing and patterns but may lack individual initiative.' :
          'Strong self-empowerment but may be internally focused.'
        }`
      });
    }
  }

  // Career type distribution
  const builders = (careerTypes['Classic Builder'] || 0) + (careerTypes['Express Builder'] || 0);
  const advisors = careerTypes['Advisor'] || 0;
  const initiators = careerTypes['Initiator'] || 0;

  if (builders === 0) {
    recs.push({
      category: 'Team Composition',
      insight: 'No Builders (Generators) in the group. The team may lack sustained work energy. Consider adding a Generator or Manifesting Generator.'
    });
  }
  if (advisors === 0 && memberCount >= 3) {
    recs.push({
      category: 'Team Composition',
      insight: 'No Advisors (Projectors) in the group. The team may lack guidance and efficiency optimization. Consider adding a Projector.'
    });
  }

  // Optimal size
  if (memberCount < 3) {
    recs.push({
      category: 'Group Size',
      insight: 'A true Penta requires 3-5 members. With fewer, the trans-auric form is incomplete. Consider adding members for fuller group dynamics.'
    });
  } else if (memberCount > 5) {
    recs.push({
      category: 'Group Size',
      insight: `With ${memberCount} members, this group extends beyond a single Penta. Consider organizing into sub-teams of 3-5 for optimal small-group dynamics.`
    });
  }

  return recs;
}

export default analyzePenta;
