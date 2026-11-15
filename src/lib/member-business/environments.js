// Work-environment screening for one member: derived facts only.
// No prose, no score, no ranking and no "best / unsuitable" verdict. Several environments
// may be supported at once; each one names the screening step that produced the evidence.
export const MB_ENVIRONMENT_MODEL_VERSION = 'member-business-environments-v1';
/** Fixed summary order for the five work environments; never re-sorted by evidence count. */
export const MB_ENVIRONMENT_IDS = Object.freeze(['solo', 'partnership', 'publicFlow', 'penta', 'organization']);

/** Teaching rule per screening step. Step 2 (aura) deliberately lights nothing for Builders. */
const DEFINITION_ENVIRONMENT = Object.freeze({
  single: 'solo',
  split: 'partnership',
  tripleSplit: 'publicFlow',
  quadrupleSplit: 'organization'
});
const AURA_ENVIRONMENT = Object.freeze({
  manifestor: 'solo',
  reflector: 'solo',
  projector: 'partnership'
});

/** Collaboration note only: the tribal boundary channels named by the product review. */
export const MB_TRIBAL_BOUNDARY_CHANNEL_IDS = Object.freeze(['21-45', '37-40']);

const point = (environmentId, level, extra = {}) => ({ environmentId, level, ...extra });

const emptyEnvironments = () => MB_ENVIRONMENT_IDS.map(environmentId => ({
  environmentId, supportedBy: [], cautionBy: []
}));

const base = () => ({
  modelVersion: MB_ENVIRONMENT_MODEL_VERSION,
  status: 'unavailable',
  issues: [],
  definitionId: null,
  typeId: null,
  environments: emptyEnvironments(),
  steps: []
});

/** Ready is not enough: every field the screening reads is checked explicitly, so a truncated
 *  result can never be read as "checked, nothing found". */
const TYPE_ENUM = new Set(['manifestor', 'generator', 'manifestingGenerator', 'projector', 'reflector']);
const DEFINITION_ENUM = new Set(['none', 'single', 'split', 'tripleSplit', 'quadrupleSplit']);
const isArray = value => Array.isArray(value);
const integer = value => Number.isInteger(value);

function incomplete(analysis) {
  const problems = [];
  const require = (condition, path) => { if (!condition) problems.push(path); };
  require(TYPE_ENUM.has(analysis.typeId), 'typeId');
  require(DEFINITION_ENUM.has(analysis.definitionId), 'definitionId');
  require(isArray(analysis.channelIds), 'channelIds');
  require(isArray(analysis.integration?.channelIds), 'integration.channelIds');
  for (const key of ['activeGateIds', 'missingGateIds', 'channelIds']) {
    require(isArray(analysis.penta?.[key]), `penta.${key}`);
  }
  require(isArray(analysis.organization?.channelIds), 'organization.channelIds');
  for (const tier of ['upper', 'middle', 'lower']) {
    const group = analysis.organization?.groups?.[tier];
    require(isArray(group?.channelIds), `organization.groups.${tier}.channelIds`);
    require(integer(group?.gateCount), `organization.groups.${tier}.gateCount`);
    require(integer(group?.gateTotal), `organization.groups.${tier}.gateTotal`);
  }
  return problems;
}

/**
 * @param {object} analysis result of analyzeMemberBusiness
 * @returns {object} serializable screening facts; never throws on missing input
 */
export function analyzeMemberEnvironments(analysis) {
  const result = base();
  if (!analysis || typeof analysis !== 'object') {
    result.issues.push({ code: 'ENVIRONMENT_ANALYSIS_INPUT', severity: 'blocking',
      path: 'analysis', message: 'A member analysis result is required' });
    return result;
  }
  result.definitionId = analysis.definitionId ?? null;
  result.typeId = analysis.typeId ?? null;
  if (analysis.status !== 'ready') {
    result.issues.push({ code: 'ENVIRONMENT_ANALYSIS_NOT_READY', severity: 'blocking',
      path: 'analysis.status', message: 'Member analysis is not ready' });
    return result;
  }
  const problems = incomplete(analysis);
  if (problems.length) {
    result.issues.push({ code: 'ENVIRONMENT_ANALYSIS_INCOMPLETE', severity: 'blocking',
      path: problems[0], message: `Missing or malformed analysis fields: ${problems.join(', ')}`, fields: problems });
    return result;
  }

  const channelIds = Array.isArray(analysis.channelIds) ? analysis.channelIds : [];
  const integrationChannelIds = Array.isArray(analysis.integration?.channelIds) ? analysis.integration.channelIds : [];
  const activePentaGates = Array.isArray(analysis.penta?.activeGateIds) ? analysis.penta.activeGateIds : [];
  const missingPentaGates = Array.isArray(analysis.penta?.missingGateIds) ? analysis.penta.missingGateIds : [];
  const steps = [];

  // Step 1 — information processing decides whether other people are needed to close the internal break.
  const definitionEnvironment = DEFINITION_ENVIRONMENT[analysis.definitionId] ?? null;
  steps.push({
    step: 1, kind: 'definition',
    facts: { definitionId: analysis.definitionId, definitionComponentCount: analysis.definitionComponentCount },
    points: definitionEnvironment ? [point(definitionEnvironment, 'supported')] : []
  });

  // Step 2 — aura. Builders stay open to every setting; later steps do that reading.
  const auraEnvironment = AURA_ENVIRONMENT[analysis.typeId] ?? null;
  steps.push({ step: 2, kind: 'aura', facts: { typeId: analysis.typeId },
    points: auraEnvironment ? [point(auraEnvironment, 'supported')] : [] });

  // Step 3 — integration wiring narrows solo work to hands-on execution; it never overrides another step.
  steps.push({
    step: 3, kind: 'integration',
    facts: { channelIds: integrationChannelIds },
    points: integrationChannelIds.length ? [point('solo', 'supported', { scope: 'execution' })] : []
  });

  // Step 4 — a complete Penta channel is the verifiable form of "forming a connection"; gate counts are
  // shown as facts and never become a fit threshold, a caution or a "too few" reminder.
  const pentaFacts = {
    activeGateIds: activePentaGates,
    activeGateCount: activePentaGates.length,
    gateTotal: activePentaGates.length + missingPentaGates.length,
    channelIds: Array.isArray(analysis.penta?.channelIds) ? analysis.penta.channelIds : []
  };
  steps.push({
    step: 4, kind: 'penta', facts: pentaFacts,
    points: pentaFacts.channelIds.length ? [point('penta', 'supported', { basis: 'completeChannel' })] : []
  });

  // Step 5 — organizing axis channels open the large-organization interface. The nine-axis set is
  // rebuilt from the three tier groups only: analysis.organization.channelIds is the 32-channel
  // department coverage and never counts as an axis basis on its own.
  // Tribal boundary channels only add a collaboration note; a single channel never asserts clique,
  // exclusion or private turf.
  const groups = analysis.organization?.groups ?? {};
  const tiers = Object.fromEntries(['upper', 'middle', 'lower'].map(tier => [tier, {
    channelIds: Array.isArray(groups[tier]?.channelIds) ? groups[tier].channelIds : [],
    gateCount: Number.isInteger(groups[tier]?.gateCount) ? groups[tier].gateCount : 0,
    gateTotal: Number.isInteger(groups[tier]?.gateTotal) ? groups[tier].gateTotal : 0
  }]));
  const axisChannelIds = [...new Set(['upper', 'middle', 'lower'].flatMap(tier => tiers[tier].channelIds))];
  const organizationChannelIds = Array.isArray(analysis.organization?.channelIds)
    ? analysis.organization.channelIds : [];
  const tribalChannelIds = MB_TRIBAL_BOUNDARY_CHANNEL_IDS.filter(id => channelIds.includes(id));
  const oc16Points = [];
  if (axisChannelIds.length) oc16Points.push(point('organization', 'supported'));
  if (tribalChannelIds.length) oc16Points.push(point('organization', 'caution', { reason: 'tribalBoundary' }));
  steps.push({
    step: 5, kind: 'oc16',
    facts: { axisChannelIds, tiers, tribalChannelIds, organizationChannelIds },
    points: oc16Points
  });

  const environments = emptyEnvironments();
  for (const entry of steps) {
    for (const item of entry.points) {
      const record = environments.find(row => row.environmentId === item.environmentId);
      if (!record) continue;
      if (item.level === 'caution') {
        if (!record.cautionBy.includes(entry.step)) record.cautionBy.push(entry.step);
      } else if (!record.supportedBy.includes(entry.step)) record.supportedBy.push(entry.step);
    }
  }
  return { ...result, status: 'ready', environments, steps };
}
