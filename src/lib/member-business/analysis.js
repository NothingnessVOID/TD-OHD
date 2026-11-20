// Personal business analysis for one member: derived structural facts only.
// No prose, no score, no fit threshold, no "only suitable for" conclusion.
// The personal chart of the selected member is the only activation source; group/alpha
// aggregates and stored libraries are never read here.
import { CHANNELS, TYPES } from '../human-design/catalog.js';
import { definitionFacts, definitionIds, definitionNames } from '../human-design/identities.js';
import { PENTA_CHANNELS, PENTA_GATES } from '../human-design/penta-catalog.js';
import { extractTeamActivations, TeamStructureError } from '../human-design/team-activation.js';
import { OC16_AXIS, OC16_DEPARTMENTS } from '../wa/oc16-catalog.js';

export const MEMBER_BUSINESS_MODEL_VERSION = 'member-business-analysis-v1';

/** BG5 career identity per stable Human Design type id. The id is the only join key. */
export const CAREER_ID_BY_TYPE = Object.freeze({
  generator: 'classicBuilder',
  manifestingGenerator: 'expressBuilder',
  manifestor: 'initiator',
  projector: 'advisor',
  reflector: 'evaluator'
});
const TYPE_IDS = Object.freeze(Object.keys(CAREER_ID_BY_TYPE));
/** Exact display-name fallback only; names come from the shared catalog, never from a guess. */
const TYPE_ID_BY_NAME = Object.freeze(Object.fromEntries(
  Object.entries(TYPES).map(([id, data]) => [data.name, id])));

/** Stable ascending channel id straight from the shared topology catalog. */
const PERSONAL_CHANNELS = Object.freeze(CHANNELS.map(channel => {
  const gates = Object.freeze([...channel.gates].sort((a, b) => a - b));
  return Object.freeze({ channelId: gates.join('-'), gates });
}));

/** Integration circuit, explicit textbook scope: exactly these four reference channels. */
export const INTEGRATION_CHANNEL_IDS = Object.freeze(['10-20', '10-57', '20-34', '34-57']);

/** The 32 organization channels are referenced through the OC16 catalog, never re-listed here. */
const OC16_CHANNEL_IDS = Object.freeze([...new Set(OC16_DEPARTMENTS.flatMap(department =>
  department.pairs.map(pair => pair.channelId)))]);
const OC16_CHANNEL_ID_SET = new Set(OC16_CHANNEL_IDS);

/** Nine-axis tiers: channel ids and the tier's six gates come from OC16_AXIS itself. */
const AXIS_TIERS = Object.freeze(['upper', 'middle', 'lower'].map(tier => Object.freeze({
  tier,
  channelIds: Object.freeze(OC16_AXIS.filter(row => row.tier === tier).map(row => row.channelId)),
  gateIds: Object.freeze(OC16_AXIS.filter(row => row.tier === tier).flatMap(row => row.pair.gates))
})));

const PENTA_GATE_IDS = Object.freeze(PENTA_GATES.map(cell => cell.gate).sort((a, b) => a - b));

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const numeric = values => [...new Set(values)].sort((a, b) => a - b);
const byChannelId = (a, b) => {
  const [aFirst, aSecond] = a.split('-').map(Number);
  const [bFirst, bSecond] = b.split('-').map(Number);
  return aFirst - bFirst || aSecond - bSecond;
};
const nonemptyString = value => typeof value === 'string' && value.trim() !== '';
const issue = (code, severity, path, message) => ({ code, severity, path, message });

/** Canonical ids plus the exact identity tokens from identities.js; no fuzzy matching. */
const DEFINITION_ID_BY_TOKEN = Object.freeze({
  ...Object.fromEntries(Object.entries(definitionIds).map(([raw, id]) => [raw, id])),
  ...Object.fromEntries(Object.entries(definitionNames).map(([raw, name]) => [name, definitionIds[raw]])),
  ...Object.fromEntries(Object.values(definitionIds).map(id => [id, id]))
});

const emptyGroups = () => Object.fromEntries(AXIS_TIERS.map(({ tier, gateIds }) => [tier, {
  tier, channelIds: [], gateIds: [], gateCount: 0, gateTotal: new Set(gateIds).size
}]));

const baseResult = (input) => {
  const timeUnknown = input?.timeUnknown === true;
  const confidence = nonemptyString(input?.birthTimeConfidence) ? input.birthTimeConfidence.trim() : null;
  return {
    modelVersion: MEMBER_BUSINESS_MODEL_VERSION,
    scope: 'personal-chart',
    status: 'unavailable',
    issues: [],
    memberId: nonemptyString(input?.memberId) ? input.memberId : null,
    personId: nonemptyString(input?.personId) ? input.personId : null,
    // Only explicit input is kept: a 12:00 birth time alone never means "time unknown".
    timeUnknown,
    birthTimeConfidence: confidence,
    typeId: null,
    careerId: null,
    definitionId: null,
    definitionComponentCount: null,
    definitionComponents: [],
    gateIds: [],
    channelIds: [],
    integration: { scope: 'textbook-channels', channelIds: [] },
    penta: { activeGateIds: [], missingGateIds: [], channelIds: [] },
    organization: { channelIds: [], groups: emptyGroups() },
    activations: [],
    steps: []
  };
};

function resolveTypeId(chart) {
  for (const candidate of [chart.type?.id, chart.calculation?.type?.id]) {
    if (nonemptyString(candidate) && TYPE_IDS.includes(candidate)) return candidate;
  }
  for (const candidate of [chart.type?.name, chart.calculation?.type?.rawId]) {
    if (nonemptyString(candidate) && TYPE_ID_BY_NAME[candidate]) return TYPE_ID_BY_NAME[candidate];
  }
  return null;
}

function resolveDefinition(chart) {
  const calculation = record(chart.calculation?.definition) ? chart.calculation.definition : null;
  // Every known source token is resolved so a contradiction between them can be named.
  const sources = [['chart.calculation.definition.id', calculation?.id],
    ['chart.calculation.definition.rawId', calculation?.rawId], ['chart.definition', chart.definition]]
    .filter(([, token]) => nonemptyString(token))
    .map(([path, token]) => [path, DEFINITION_ID_BY_TOKEN[token.trim()] ?? null])
    .filter(([, id]) => Boolean(id));
  const definitionId = sources[0]?.[1] ?? null;
  const conflicting = sources.find(([, id]) => id !== definitionId) ?? null;
  const reported = Number.isInteger(calculation?.componentCount) ? calculation.componentCount : null;
  // A component count has no meaning without a resolved definition id.
  const componentCount = definitionId ? reported ?? definitionFacts[definitionId].componentCount : null;
  return { definitionId, reportedComponentCount: reported, componentCount,
    conflict: conflicting ? { definitionId: conflicting[1], path: conflicting[0], resolved: definitionId } : null };
}

/** Blueprint centers per canonical channel id, straight from the shared topology catalog. */
const CHANNEL_CENTERS = new Map(PERSONAL_CHANNELS.map(channel =>
  [channel.channelId, CHANNELS.find(item => item.gates.join('-') === channel.channelId)?.centers ?? null]));

/** Definition is the number of connected islands among defined centers. Pure derivation from the
 *  channel centers the catalog already declares; the engine keeps owning its own calculation. */
function deriveDefinitionComponents(channelIds) {
  const neighbours = new Map();
  const link = (a, b) => {
    if (!neighbours.has(a)) neighbours.set(a, new Set());
    if (!neighbours.has(b)) neighbours.set(b, new Set());
    neighbours.get(a).add(b);
    neighbours.get(b).add(a);
  };
  for (const channelId of channelIds) {
    const centers = CHANNEL_CENTERS.get(channelId);
    if (!Array.isArray(centers) || centers.length < 2) continue;
    link(centers[0], centers[1]);
  }
  const seen = new Set();
  const components = [];
  for (const center of [...neighbours.keys()].sort()) {
    if (seen.has(center)) continue;
    const island = [];
    const queue = [center];
    seen.add(center);
    while (queue.length) {
      const current = queue.shift();
      island.push(current);
      for (const next of neighbours.get(current)) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    components.push(island.sort());
  }
  return { componentCount: components.length, components };
}

function deriveCompleteChannelIds(activeGates) {
  const active = new Set(activeGates);
  return PERSONAL_CHANNELS.filter(channel => channel.gates.every(gate => active.has(gate)))
    .map(channel => channel.channelId).sort(byChannelId);
}

/**
 * @param {{memberId?: string, personId?: string, chart?: object,
 *   timeUnknown?: boolean, birthTimeConfidence?: string}} input
 * @returns {object} serializable analysis result; never throws on bad or partial charts.
 */
export function analyzeMemberBusiness(input = {}) {
  const result = baseResult(input);
  try {
    if (!nonemptyString(input?.memberId)) {
      result.issues.push(issue('INVALID_MEMBER_ID', 'blocking', 'memberId', 'memberId must be a nonempty string'));
      return result;
    }
    // personId is optional, but an explicitly supplied invalid value is never silently cleared.
    if (Object.hasOwn(input, 'personId') && input.personId !== undefined && !nonemptyString(input.personId)) {
      result.issues.push(issue('INVALID_PERSON_ID', 'blocking', 'personId', 'personId must be a nonempty string when supplied'));
      return result;
    }
    let activations;
    try {
      activations = extractTeamActivations({ memberId: input.memberId, chart: input.chart });
    } catch (error) {
      const code = error instanceof TeamStructureError ? error.code : 'INVALID_CHART';
      const path = error instanceof TeamStructureError ? error.path : 'chart';
      result.issues.push(issue(code, 'blocking', path, error?.message ?? 'Chart activations are unreadable'));
      result.steps.push({ stepId: 'member-activations', status: 'fail', activationCount: 0, issueCode: code });
      return result;
    }
    result.activations = activations.map(activation => ({ ...activation }));
    const gateIds = numeric(activations.map(activation => activation.gate));
    result.issues.push(...(activations.length === 26 ? [] : [
      issue('INVALID_ACTIVATION_COUNT', 'blocking', 'chart.gates',
        `Expected 26 personal activations; received ${activations.length}`)]));

    const channelIds = deriveCompleteChannelIds(gateIds);
    result.gateIds = gateIds;
    result.channelIds = channelIds;
    result.definitionComponents = deriveDefinitionComponents(channelIds).components;
    result.steps.push({ stepId: 'member-activations', status: activations.length === 26 ? 'pass' : 'fail',
      activationCount: activations.length, gateIds });
    result.steps.push({ stepId: 'personal-channels', status: 'pass', channelIds });

    const typeId = resolveTypeId(input.chart);
    result.typeId = typeId;
    result.careerId = typeId ? CAREER_ID_BY_TYPE[typeId] : null;
    if (!typeId) {
      result.issues.push(issue('TYPE_UNAVAILABLE', 'blocking', 'chart.type.id',
        'chart.type.id is not a supported stable type id'));
    }
    result.steps.push({ stepId: 'career-type', status: typeId ? 'pass' : 'fail',
      typeId, careerId: result.careerId });

    const definition = resolveDefinition(input.chart);
    result.definitionId = definition.definitionId;
    result.definitionComponentCount = definition.componentCount;
    if (!definition.definitionId) {
      result.issues.push(issue('DEFINITION_UNAVAILABLE', 'blocking', 'chart.calculation.definition.id',
        'Definition id is missing or not a supported stable definition id'));
    }
    if (definition.conflict) {
      result.issues.push(issue('DEFINITION_SOURCE_CONFLICT', 'blocking', definition.conflict.path,
        `${definition.conflict.path} says ${definition.conflict.definitionId} but another source says ${definition.conflict.resolved}`));
    }
    if (definition.definitionId && definition.reportedComponentCount !== null &&
      definition.reportedComponentCount !== definitionFacts[definition.definitionId].componentCount) {
      result.issues.push(issue('DEFINITION_COMPONENT_MISMATCH', 'blocking',
        'chart.calculation.definition.componentCount',
        `Reported ${definition.reportedComponentCount} components for ${definition.definitionId}`));
    }
    result.steps.push({ stepId: 'definition', status: definition.definitionId ? 'pass' : 'fail',
      definitionId: definition.definitionId, definitionComponentCount: definition.componentCount });

    // Explicit, evidence-based contradictions only: readiness is never assumed.
    if (typeId === 'reflector' && definition.definitionId && definition.definitionId !== 'none') {
      result.issues.push(issue('REFLECTOR_DEFINITION_CONFLICT', 'blocking', 'chart.calculation.definition.id',
        `Reflector chart reports ${definition.definitionId} definition`));
    }
    if (typeId && typeId !== 'reflector' && definition.definitionId === 'none') {
      result.issues.push(issue('NO_DEFINITION_FOR_DEFINED_TYPE', 'blocking', 'chart.calculation.definition.id',
        `${typeId} chart reports no definition`));
    }
    if (definition.definitionId === 'none' && channelIds.length > 0) {
      result.issues.push(issue('NO_DEFINITION_WITH_COMPLETE_CHANNEL', 'blocking', 'chart.gates',
        'No definition is inconsistent with complete personal channels'));
    }
    if (definition.definitionId && definition.definitionId !== 'none' && channelIds.length === 0) {
      result.issues.push(issue('DEFINITION_WITHOUT_COMPLETE_CHANNEL', 'blocking', 'chart.gates',
        `${definition.definitionId} definition requires at least one complete channel`));
    }
    // The chart's own complete channels must describe the same number of islands as the definition.
    // A single island (e.g. 3–60 alone) can never pass as split, triple or quadruple.
    if (definition.definitionId && channelIds.length > 0) {
      const derived = result.definitionComponents.length;
      if (derived !== definitionFacts[definition.definitionId].componentCount) {
        result.issues.push(issue('DEFINITION_COMPONENT_CONFLICT', 'blocking', 'chart.gates',
          `Complete channels form ${derived} island(s) but ${definition.definitionId} requires ${definitionFacts[definition.definitionId].componentCount}`));
      }
    }

    const integrationChannelIds = INTEGRATION_CHANNEL_IDS.filter(id => channelIds.includes(id))
      .sort(byChannelId);
    result.integration = { scope: 'textbook-channels', channelIds: integrationChannelIds };
    result.steps.push({ stepId: 'integration', status: 'pass', channelIds: integrationChannelIds });

    // Penta membership and edges are read from the shared Penta catalog.
    const activeGateSet = new Set(gateIds);
    const activePentaGates = PENTA_GATE_IDS.filter(gate => activeGateSet.has(gate));
    const pentaChannelIds = PENTA_CHANNELS
      .filter(channel => channel.gates.every(gate => activeGateSet.has(gate)))
      .map(channel => channel.channelId).sort(byChannelId);
    result.penta = {
      activeGateIds: activePentaGates,
      missingGateIds: PENTA_GATE_IDS.filter(gate => !activeGateSet.has(gate)),
      channelIds: pentaChannelIds
    };
    result.steps.push({ stepId: 'penta', status: 'pass',
      activeGateIds: activePentaGates, channelIds: pentaChannelIds });

    const organizationChannelIds = channelIds.filter(id => OC16_CHANNEL_ID_SET.has(id));
    const groups = Object.fromEntries(AXIS_TIERS.map(({ tier, channelIds: tierChannels, gateIds: tierGates }) => {
      const owned = tierChannels.filter(id => channelIds.includes(id)).sort(byChannelId);
      const hitGateIds = numeric(tierGates.filter(gate => activeGateSet.has(gate)));
      return [tier, {
        tier, channelIds: owned, gateIds: hitGateIds,
        gateCount: hitGateIds.length, gateTotal: new Set(tierGates).size
      }];
    }));
    result.organization = { channelIds: organizationChannelIds, groups };
    result.steps.push({ stepId: 'organization', status: 'pass', channelIds: organizationChannelIds,
      gateCounts: Object.fromEntries(AXIS_TIERS.map(({ tier }) => [tier, groups[tier].gateCount])) });

    result.status = result.issues.some(item => item.severity === 'blocking') ? 'unavailable' : 'ready';
    if (result.status === 'unavailable') {
      result.steps.push({ stepId: 'readiness', status: 'fail',
        issueCodes: result.issues.filter(item => item.severity === 'blocking').map(item => item.code) });
    }
    return result;
  } catch (error) {
    // A corrupt or unexpected chart must not crash the view; the result stays inspectable.
    result.status = 'unavailable';
    result.issues.push(issue('ANALYSIS_FAILED', 'blocking', 'chart',
      error?.message ?? 'Member business analysis failed'));
    return result;
  }
}
