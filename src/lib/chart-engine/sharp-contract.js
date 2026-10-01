// TD-OHD's stable chart contract. Local modules supply descriptive catalogs;
// every planetary activation and the 88-degree design date come from SharpAstrology.
import { GATES, CHANNELS, CENTERS, TYPES, PROFILES, AUTHORITIES, CIRCUIT_GROUPS } from '../human-design/catalog.js';
import { variablePresentation, variableValueId } from '../human-design/variable-data.js';
import { channelCircuit } from '../circuit-topology.js';

const centerKeys = { Root: 'root', Sacral: 'sacral', Emotions: 'solar', Spleen: 'spleen', Heart: 'heart', Self: 'g', Throat: 'throat', Mind: 'ajna', Crown: 'head' };
const typeKeys = { Manifestor: 'manifestor', ManifestingGenerator: 'manifestingGenerator', Generator: 'generator', Projector: 'projector', Reflector: 'reflector' };
const authorityIds = { Emotional: 'emotional', Sacral: 'sacral', Splenic: 'splenic', EgoManifested: 'egoManifested', EgoProjected: 'egoProjected', SelfProjected: 'selfProjected', Mental: 'mental', Lunar: 'lunar' };
const definitionIds = { Empty: 'none', SingleDefinition: 'single', SplitDefinition: 'split', TripleSplit: 'tripleSplit', QuadrupleSplit: 'quadrupleSplit' };
const authorityKeys = { Emotional: 'emotional', Sacral: 'sacral', Splenic: 'splenic', EgoManifested: 'ego', EgoProjected: 'ego', SelfProjected: 'self', Mental: 'mental', Lunar: 'lunar' };
const definitionNames = { Empty: 'No Definition', SingleDefinition: 'Single Definition', SplitDefinition: 'Split Definition', TripleSplit: 'Triple Split Definition', QuadrupleSplit: 'Quadruple Split Definition' };
const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

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
  // Deterministic TD-OHD derivation from Sharp activations.
  const display = variablePresentation(kind, color, tone);
  return { kind, valueId: variableValueId(kind, color),
    direction: tone <= 3 ? 'left' : 'right', arrow: tone <= 3 ? 'left' : 'right', color, tone, base,
    ...display }; // Legacy presentation fields remain compatible.
}
function makeVariable(personality, design) {
  const determination = variableItem('determination', design.sun);
  const environment = variableItem('environment', design.northNode);
  const motivation = variableItem('motivation', personality.sun);
  const perspective = variableItem('perspective', personality.northNode);
  const letter = item => item.arrow === 'left' ? 'L' : 'R';
  const notation = `P${letter(motivation)}${letter(perspective)} D${letter(determination)}${letter(environment)}`;
  return { determination, environment, motivation, perspective,
    notation, standardNotation: notation,
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
    // Preserve legacy metadata for relationship/team compatibility; effective taxonomy uses channelCircuit.
    return channel;
  });
  for (const [center, state] of Object.entries(raw.centers)) {
    if (!centerKeys[center] || !['None', 'FirstComparator', 'SecondComparator', 'Mixed'].includes(state))
      throw new Error(`Unknown SharpAstrology center activation: ${center}/${state}`);
  }
  const definedNames = Object.entries(raw.centers).filter(([, v]) => v !== 'None').map(([k]) => centerKeys[k]);
  if (definedNames.includes(undefined)) throw new Error('Unknown SharpAstrology center');
  const undefinedNames = Object.keys(CENTERS).filter(key => !definedNames.includes(key) && all.some(g => GATES[g].center === key));
  const openNames = Object.keys(CENTERS).filter(key => !definedNames.includes(key) && !undefinedNames.includes(key));
  const detail = (key, status) => ({ ...CENTERS[key], key,
    ...(status === 'defined' ? {} : { status, activatedGates: all.filter(g => GATES[g].center === key) }) });
  // Raw Sharp component numbers are provenance, not a presentation order.
  const componentGroups = new Map();
  for (const [center, component] of Object.entries(raw.connectedComponents ?? {})) {
    const key = centerKeys[center];
    if (!key || !Number.isInteger(component)) throw new Error(`Invalid SharpAstrology component: ${center}/${component}`);
    if (!componentGroups.has(component)) componentGroups.set(component, []);
    componentGroups.get(component).push(key);
  }
  const definitionComponents = [...componentGroups.values()].map(group => group.sort()).sort((a,b) => a[0].localeCompare(b[0]));
  const centerStates = Object.fromEntries(Object.entries(raw.centers).map(([key, value]) => [centerKeys[key], { rawId: key, rawActivation: value, defined: value !== 'None' }]));
  const profileNumbers = raw.profile.replaceAll(' ', '');
  const crossGates = [personality.sun.gate, personality.earth.gate, design.sun.gate, design.earth.gate];
  const angle = profileNumbers === '4/1' ? 'juxtaposition' : ['5/1', '5/2', '6/2', '6/3'].includes(profileNumbers) ? 'left' : 'right';
  const angleName = { right: 'Right Angle', left: 'Left Angle', juxtaposition: 'Juxtaposition' }[angle];
  const crossName = raw.incarnationCross.replace(/^(RightAngle|LeftAngle|Juxtaposition)CrossOf/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Za-z])(\d+)$/, '$1 $2');
  const cross = { rawId: raw.incarnationCross, angle, angleName, name: crossName,
    fullName: `${angleName} Cross of ${crossName} (${crossGates[0]}/${crossGates[1]} | ${crossGates[2]}/${crossGates[3]})`,
    gates: crossGates, gateNames: crossGates.map(g => GATES[g].name) };
  const circuitAnalysis = Object.fromEntries(Object.keys(CIRCUIT_GROUPS).map(key => [key, {
    channels: activeChannels.filter(c => channelCircuit(c).group === key).length,
    names: activeChannels.filter(c => channelCircuit(c).group === key).map(c => c.name)
  }]));
  const dominantEntry = Object.entries(circuitAnalysis).sort((a, b) => b[1].channels - a[1].channels)[0];
  circuitAnalysis.dominant = dominantEntry?.[1].channels ? { name: dominantEntry[0], ...CIRCUIT_GROUPS[dominantEntry[0]], channelCount: dominantEntry[1].channels } : null;
  const typeData = TYPES[typeKeys[raw.type]];
  const type = typeData && { ...typeData, id: typeKeys[raw.type], rawId: raw.type };
  const authorityData = AUTHORITIES[authorityKeys[raw.authority]];
  const authority = authorityData && { ...authorityData, id: authorityIds[raw.authority], rawId: raw.authority, family: authorityKeys[raw.authority] };
  if (!type || !authority) throw new Error(`Unknown SharpAstrology type or authority: ${raw.type}/${raw.authority}`);
  const variable = makeVariable(personality, design);
  return {
    contractVersion: 'adapter-v2',
    // Preserve compact raw identifiers and timestamps for provenance.
    raw: { type: raw.type, authority: raw.authority, profile: raw.profile, definition: raw.definition,
      incarnationCross: raw.incarnationCross, channels: [...raw.channels], centers: { ...raw.centers },
      connectedComponents: { ...(raw.connectedComponents ?? {}) }, birthUtc: raw.birthUtc, designUtc: raw.designUtc },
    // Calculation identity is distinct from the legacy local presentation objects below.
    calculation: { type: { id: type.id, rawId: raw.type },
      authority: { id: authority.id, rawId: raw.authority, family: authority.family },
      profile: { id: profileNumbers, rawId: raw.profile },
      definition: { id: definitionIds[raw.definition] ?? raw.definition, rawId: raw.definition,
        componentCount: raw.connectedComponents == null ? null : definitionComponents.length },
      incarnationCross: { rawId: raw.incarnationCross },
      channels: activeChannels.map((c, index) => ({ rawId: raw.channels[index], gates: [...c.gates] })), centerStates },
    // Derived mechanics contain no knowledge prose. Components normalize Sharp's island map.
    derived: { definitionComponents, variable: Object.fromEntries(Object.entries(variable)
      .filter(([, item]) => item && typeof item === 'object' && 'color' in item)
      .map(([kind, item]) => [kind, { kind, valueId: item.valueId, color: item.color, tone: item.tone, base: item.base, direction: item.direction }])),
      cross: { gates: crossGates, angle }, circuits: Object.fromEntries(activeChannels.map(c => [c.gates.join('-'), channelCircuit(c)])) },
    definitionComponents, centerStates,
    // Local presentation metadata; not returned by SharpAstrology. Compatibility facade.
    type, authority, profile: { numbers: profileNumbers, ...PROFILES[profileNumbers], id: profileNumbers, rawId: raw.profile },
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
    variable,
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
