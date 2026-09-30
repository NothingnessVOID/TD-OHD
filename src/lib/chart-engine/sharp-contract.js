// TD-OHD's stable chart contract. NatalEngine supplies only descriptive catalogs;
// every planetary activation and the 88-degree design date come from SharpAstrology.
import { GATES, CHANNELS, CENTERS, TYPES, PROFILES, AUTHORITIES, CIRCUIT_GROUPS } from 'natalengine/humandesign';

const centerKeys = { Root: 'root', Sacral: 'sacral', Emotions: 'solar', Spleen: 'spleen', Heart: 'heart', Self: 'g', Throat: 'throat', Mind: 'ajna', Crown: 'head' };
const typeKeys = { Manifestor: 'manifestor', ManifestingGenerator: 'manifestingGenerator', Generator: 'generator', Projector: 'projector', Reflector: 'reflector' };
const authorityKeys = { Emotional: 'emotional', Sacral: 'sacral', Splenic: 'splenic', EgoManifested: 'ego', EgoProjected: 'ego', SelfProjected: 'self', Mental: 'mental', Lunar: 'lunar' };
const definitionNames = { None: 'No Definition', SingleDefinition: 'Single Definition', SplitDefinition: 'Split Definition', TripleSplitDefinition: 'Triple Split Definition', QuadrupleSplitDefinition: 'Quadruple Split Definition' };
const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const variableNames = {
  determination: ['Appetite', 'Taste', 'Thirst', 'Touch', 'Sound', 'Light'],
  environment: ['Caves', 'Markets', 'Kitchens', 'Mountains', 'Valleys', 'Shores'],
  motivation: ['Fear', 'Hope', 'Desire', 'Need', 'Guilt', 'Innocence'],
  perspective: ['Survival', 'Possibility', 'Power', 'Wanting', 'Probability', 'Personal']
};
const cognitionNames = ['Smell', 'Taste', 'Outer Vision', 'Inner Vision', 'Feeling', 'Touch'];
const variableDescriptions = {
  determination: [
    'Eat simple, one thing at a time. Consecutive diet.',
    'Sensitive palate. Open or closed taste preferences.',
    'Temperature sensitivity. Hot or cold food and drink.',
    'Environment affects digestion. Calm surroundings needed.',
    'Acoustic environment matters. Sound affects metabolism.',
    'Light conditions affect eating. Direct or indirect light.'
  ],
  environment: [
    'Enclosed, protected, selective spaces. Privacy and shelter.',
    'Places of exchange and gathering. Commercial, busy spaces.',
    'Transformative spaces where things are heated and prepared.',
    'Elevated spaces with views and room to see.',
    'Acoustically rich environments. Sounds and resonance.',
    'Transitional spaces. Edges, boundaries, thresholds.'
  ],
  motivation: [
    'Motivated to understand the unknown. Natural researcher and learner.',
    'Motivated by patience and trust. Waits and observes before acting.',
    'Motivated to move and organize. Initiates with purpose.',
    'Motivated by service. Identifies what must be done for the collective.',
    'Motivated by deep responsibility. Driven to fix and manage.',
    'Motivated by non-doing. Shows up without agenda or expectation.'
  ],
  perspective: [
    'Awareness focused on security and self-preservation.',
    'Open, optimistic view. Sees potential everywhere.',
    'Focused on influence and impact. Sees dynamics of control.',
    'Driven by desire. Sees what is needed or missing.',
    'Analytical, practical view. Calculates odds and outcomes.',
    'Introspective, self-reflective, deeply personal lens.'
  ]
};

const pad = n => String(n).padStart(2, '0');
const dateOnly = iso => iso.slice(0, 10);
function localDateTime(iso, timezone) {
  const date = new Date(Date.parse(iso) + timezone * 3_600_000);
  return `${date.getUTCFullYear().toString().padStart(4, '0')}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}
function position({ longitude }) {
  const normalized = ((longitude % 360) + 360) % 360;
  const inSign = normalized % 30;
  const totalSeconds = Math.round(inSign * 3600);
  return { longitude, sign: signs[Math.floor(normalized / 30)],
    degree: `${Math.floor(totalSeconds / 3600)}°${pad(Math.floor(totalSeconds / 60) % 60)}'${pad(totalSeconds % 60)}"` };
}
function activation([planet, data]) {
  const gate = GATES[data.gate];
  if (!gate || !Number.isInteger(data.line) || data.line < 1 || data.line > 6 ||
    !Number.isInteger(data.color) || data.color < 1 || data.color > 6 ||
    !Number.isInteger(data.tone) || data.tone < 1 || data.tone > 6 ||
    !Number.isInteger(data.base) || data.base < 1 || data.base > 5) {
    throw new Error(`Invalid SharpAstrology activation for ${planet}`);
  }
  return [planet, { planet, ...data, ...gate, gate: data.gate, center: gate.center }];
}
function variableItem(kind, data) {
  const { color, tone, base } = data;
  return { arrow: tone <= 3 ? 'left' : 'right', color, tone, base,
    name: variableNames[kind][color - 1], description: variableDescriptions[kind][color - 1],
    ...(kind === 'determination' ? { cognition: { name: cognitionNames[tone - 1] } } : {}) };
}
function makeVariable(personality, design) {
  const determination = variableItem('determination', design.sun);
  const environment = variableItem('environment', design.northNode);
  const motivation = variableItem('motivation', personality.sun);
  const perspective = variableItem('perspective', personality.northNode);
  const letter = item => item.arrow === 'left' ? 'L' : 'R';
  return { determination, environment, motivation, perspective,
    notation: `${letter(determination)}${letter(environment)} ${letter(motivation)}${letter(perspective)}`,
    standardNotation: `P${letter(motivation)}${letter(perspective)} D${letter(determination)}${letter(environment)}`,
    digestiveType: determination.name, environmentType: environment.name,
    motivationType: motivation.name, perspectiveType: perspective.name };
}

export function adaptSharpChart(raw, birth) {
  const personality = Object.fromEntries(Object.entries(raw.personality).map(activation));
  const design = Object.fromEntries(Object.entries(raw.design).map(activation));
  const all = [...new Set([...Object.values(personality), ...Object.values(design)].map(a => a.gate))];
  const activeChannels = raw.channels.map(id => {
    const match = /^Key(\d+)Key(\d+)$/.exec(id);
    const channel = match && CHANNELS.find(c => c.gates[0] === +match[1] && c.gates[1] === +match[2]);
    if (!channel) throw new Error(`Unknown SharpAstrology channel: ${id}`);
    return channel;
  });
  const definedNames = Object.entries(raw.centers).filter(([, v]) => v !== 'None').map(([k]) => centerKeys[k]);
  if (definedNames.includes(undefined)) throw new Error('Unknown SharpAstrology center');
  const undefinedNames = Object.keys(CENTERS).filter(key => !definedNames.includes(key) && all.some(g => GATES[g].center === key));
  const openNames = Object.keys(CENTERS).filter(key => !definedNames.includes(key) && !undefinedNames.includes(key));
  const detail = (key, status) => ({ ...CENTERS[key], key,
    ...(status === 'defined' ? {} : { status, activatedGates: all.filter(g => GATES[g].center === key) }) });
  const profileNumbers = raw.profile.replaceAll(' ', '');
  const crossGates = [personality.sun.gate, personality.earth.gate, design.sun.gate, design.earth.gate];
  const angle = profileNumbers === '4/1' ? 'juxtaposition' : ['5/1', '5/2', '6/2', '6/3'].includes(profileNumbers) ? 'left' : 'right';
  const angleName = { right: 'Right Angle', left: 'Left Angle', juxtaposition: 'Juxtaposition' }[angle];
  const crossName = raw.incarnationCross.replace(/^(RightAngle|LeftAngle|Juxtaposition)CrossOf/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
  const cross = { angle, angleName, name: crossName,
    fullName: `${angleName} Cross of ${crossName} (${crossGates[0]}/${crossGates[1]} | ${crossGates[2]}/${crossGates[3]})`,
    gates: crossGates, gateNames: crossGates.map(g => GATES[g].name) };
  const circuitAnalysis = Object.fromEntries(Object.keys(CIRCUIT_GROUPS).map(key => [key, {
    channels: activeChannels.filter(c => c.circuit === key).length,
    names: activeChannels.filter(c => c.circuit === key).map(c => c.name)
  }]));
  const dominantEntry = Object.entries(circuitAnalysis).sort((a, b) => b[1].channels - a[1].channels)[0];
  circuitAnalysis.dominant = dominantEntry?.[1].channels ? { name: dominantEntry[0], ...CIRCUIT_GROUPS[dominantEntry[0]], channelCount: dominantEntry[1].channels } : null;
  const type = TYPES[typeKeys[raw.type]];
  const authority = AUTHORITIES[authorityKeys[raw.authority]];
  if (!type || !authority) throw new Error(`Unknown SharpAstrology type or authority: ${raw.type}/${raw.authority}`);
  return {
    type, authority, profile: { numbers: profileNumbers, ...PROFILES[profileNumbers] },
    definition: definitionNames[raw.definition] ?? raw.definition,
    incarnationCross: cross,
    centers: {
      defined: definedNames.map(k => detail(k, 'defined')),
      undefined: undefinedNames.map(k => detail(k, 'undefined')),
      open: openNames.map(k => detail(k, 'open')),
      definedNames, undefinedNames, openNames,
      allUndefinedNames: [...undefinedNames, ...openNames]
    },
    gates: { personality, design, all }, channels: activeChannels, circuitAnalysis,
    variable: makeVariable(personality, design),
    positions: {
      personality: { date: dateOnly(raw.birthUtc), ...Object.fromEntries(Object.entries(raw.personality).map(([k, v]) => [k, position(v)])) },
      design: { date: dateOnly(raw.designUtc), dateTime: localDateTime(raw.designUtc, birth.timezone ?? 0),
        ...Object.fromEntries(Object.entries(raw.design).map(([k, v]) => [k, position(v)])) }
    },
    meta: { birthDate: birth.birthDate, birthHour: +(birth.birthTime || '12:00').slice(0, 2) + +(birth.birthTime || '12:00').slice(3, 5) / 60,
      timezone: birth.timezone ?? 0, nodeType: 'true', ephemeris: 'SharpAstrology.SwissEph 0.5.1 Swiss files', designSolarArc: 88 },
    useEphemeris: true,
    summary: `${type.name} with ${authority.name}, ${PROFILES[profileNumbers]?.name || profileNumbers} Profile`
  };
}
