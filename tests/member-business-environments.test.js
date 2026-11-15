import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMemberBusiness } from '../src/lib/member-business/analysis.js';
import { analyzeMemberEnvironments, MB_ENVIRONMENT_IDS } from '../src/lib/member-business/environments.js';
import { analysisInput } from './helpers/member-business-fixtures.js';

const screening = options => analyzeMemberEnvironments(analyzeMemberBusiness(analysisInput(options)));
const environment = (result, id) => result.environments.find(row => row.environmentId === id);
const step = (result, number) => result.steps.find(row => row.step === number);

test('the five work environments keep a fixed order and carry step references only', () => {
  const result = screening({ gates: [3, 60] });
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.environments.map(row => row.environmentId), [...MB_ENVIRONMENT_IDS]);
  for (const row of result.environments) {
    for (const number of [...row.supportedBy, ...row.cautionBy]) assert.ok(Number.isInteger(number) && number >= 1 && number <= 5);
    assert.deepEqual(Object.keys(row).sort(), ['cautionBy', 'environmentId', 'supportedBy']);
  }
});

test('definition and aura steps map exactly as agreed and never light a builder', () => {
  assert.deepEqual(step(screening({ definition: 'SingleDefinition', gates: [3, 60] }), 1).points,
    [{ environmentId: 'solo', level: 'supported' }]);
  assert.deepEqual(step(screening({ definition: 'SplitDefinition', gates: [1, 8, 26, 44] }), 1).points,
    [{ environmentId: 'partnership', level: 'supported' }]);
  assert.deepEqual(step(screening({ definition: 'TripleSplit', gates: [1, 8, 26, 44, 3, 60] }), 1).points,
    [{ environmentId: 'publicFlow', level: 'supported' }]);
  assert.deepEqual(step(screening({ definition: 'QuadrupleSplit', gates: [1, 8, 26, 44, 3, 60, 47, 64] }), 1).points,
    [{ environmentId: 'organization', level: 'supported' }]);
  const projector = screening({ typeId: 'projector', gates: [3, 60] });
  assert.deepEqual(step(projector, 2).points, [{ environmentId: 'partnership', level: 'supported' }]);
  const manifestor = screening({ typeId: 'manifestor', gates: [3, 60] });
  assert.deepEqual(step(manifestor, 2).points, [{ environmentId: 'solo', level: 'supported' }]);
  for (const typeId of ['generator', 'manifestingGenerator']) {
    assert.deepEqual(step(screening({ typeId, gates: [3, 60] }), 2).points, [], `${typeId} is open to every setting`);
  }
});

test('reflector with no definition lights no definition step but keeps aura solo', () => {
  const result = screening({ typeId: 'reflector', definition: 'Empty', gates: [] });
  assert.deepEqual(step(result, 1).points, []);
  assert.deepEqual(step(result, 2).points, [{ environmentId: 'solo', level: 'supported' }]);
  assert.deepEqual(environment(result, 'solo').supportedBy, [2]);
});

test('integration channels support solo execution without overriding other environments', () => {
  const result = screening({ gates: [34, 57] });
  assert.deepEqual(step(result, 3).facts.channelIds, ['34-57']);
  assert.deepEqual(step(result, 3).points, [{ environmentId: 'solo', level: 'supported', scope: 'execution' }]);
  assert.deepEqual(environment(result, 'solo').supportedBy, [1, 3]);
  assert.deepEqual(environment(result, 'organization').supportedBy, []);
});

test('a complete Penta channel is the only group-connection basis; gate counts stay factual', () => {
  const connected = screening({ gates: [7, 31] });
  assert.equal(step(connected, 4).facts.activeGateCount, 2);
  assert.equal(step(connected, 4).facts.gateTotal, 12);
  assert.deepEqual(step(connected, 4).points, [{ environmentId: 'penta', level: 'supported', basis: 'completeChannel' }]);
  const gatesOnly = screening({ gates: [3, 60, 7] });
  assert.equal(step(gatesOnly, 4).facts.activeGateCount, 1);
  assert.deepEqual(step(gatesOnly, 4).points, []);
  assert.deepEqual(environment(gatesOnly, 'penta').cautionBy, [], 'a low gate count is never a caution');
});

test('a support channel outside the nine axes is not a large-organization basis', () => {
  // 26–44 is a full department support channel, not one of the nine organizing axes.
  const result = screening({ gates: [26, 44] });
  assert.deepEqual(step(result, 5).facts.axisChannelIds, []);
  assert.deepEqual(step(result, 5).facts.organizationChannelIds, ['26-44']);
  assert.deepEqual(step(result, 5).points, []);
  assert.deepEqual(environment(result, 'organization').supportedBy, []);
  assert.deepEqual(environment(result, 'organization').cautionBy, []);
});

test('axis channels support the organization environment and 21-45 / 37-40 only add a collaboration note', () => {
  const axis = screening({ gates: [3, 60] });
  assert.deepEqual(step(axis, 5).facts.axisChannelIds, ['3-60']);
  assert.deepEqual(step(axis, 5).points, [{ environmentId: 'organization', level: 'supported' }]);
  const tribalOnly = screening({ gates: [21, 45] });
  assert.deepEqual(step(tribalOnly, 5).facts.axisChannelIds, []);
  assert.deepEqual(step(tribalOnly, 5).facts.tribalChannelIds, ['21-45']);
  assert.deepEqual(step(tribalOnly, 5).points, [{ environmentId: 'organization', level: 'caution', reason: 'tribalBoundary' }]);
  assert.deepEqual(environment(tribalOnly, 'organization').supportedBy, []);
  assert.deepEqual(environment(tribalOnly, 'organization').cautionBy, [5]);
  const other = screening({ gates: [37, 40] });
  assert.deepEqual(step(other, 5).facts.axisChannelIds, []);
  assert.deepEqual(step(other, 5).facts.tribalChannelIds, ['37-40']);
  const both = screening({ gates: [7, 31, 21, 45] });
  assert.deepEqual(environment(both, 'organization').supportedBy, [5]);
  assert.deepEqual(environment(both, 'organization').cautionBy, [5]);
});

test('organization facts stay per tier and never become a score', () => {
  const result = screening({ definition: 'SplitDefinition', gates: [7, 31, 3, 60] });
  assert.deepEqual(step(result, 5).facts.tiers.upper.channelIds, ['7-31']);
  assert.deepEqual(step(result, 5).facts.tiers.lower.channelIds, ['3-60']);
  assert.deepEqual(step(result, 5).facts.tiers.middle.channelIds, []);
  assert.equal(step(result, 5).facts.tiers.upper.gateTotal, 6);
  assert.deepEqual(step(result, 5).facts.axisChannelIds, ['7-31', '3-60']);
  for (const row of result.environments) {
    assert.equal(Object.hasOwn(row, 'score'), false);
    assert.equal(Object.hasOwn(row, 'rank'), false);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});

test('a ready analysis with missing or malformed fields is rejected, never read as "no evidence"', () => {
  const base = analyzeMemberBusiness(analysisInput({ gates: [3, 60] }));
  assert.equal(base.status, 'ready');
  const mutations = [
    analysis => { delete analysis.channelIds; },
    analysis => { analysis.typeId = 'wizard'; },
    analysis => { analysis.definitionId = 'weird'; },
    analysis => { delete analysis.integration.channelIds; },
    analysis => { delete analysis.penta.channelIds; },
    analysis => { delete analysis.penta.missingGateIds; },
    analysis => { delete analysis.organization.channelIds; },
    analysis => { delete analysis.organization.groups.lower.gateCount; },
    analysis => { analysis.organization.groups.upper.gateTotal = '6'; },
    analysis => { analysis.organization.groups.middle.channelIds = null; }
  ];
  for (const mutate of mutations) {
    const broken = structuredClone(base);
    mutate(broken);
    const result = analyzeMemberEnvironments(broken);
    assert.equal(result.status, 'unavailable');
    assert.deepEqual(result.steps, []);
    assert.deepEqual(result.environments.map(row => row.supportedBy), [[], [], [], [], []]);
    assert.ok(result.issues.some(issue => issue.code === 'ENVIRONMENT_ANALYSIS_INCOMPLETE' && Array.isArray(issue.fields)));
  }
});

test('only explicit facts are exposed for unavailable analysis and inputs stay unchanged', () => {
  const analysisInputValue = analysisInput({ gates: [3, 60] });
  const before = structuredClone(analysisInputValue);
  const analysis = analyzeMemberBusiness(analysisInputValue);
  const result = analyzeMemberEnvironments(analysis);
  assert.equal(analysisInputValue.memberId, before.memberId);
  assert.deepEqual(analysisInputValue.chart, before.chart);
  assert.deepEqual(result.environments.map(row => row.supportedBy), [[1], [], [], [], [5]]);
  const notReady = analyzeMemberEnvironments({ ...analysis, status: 'unavailable' });
  assert.equal(notReady.status, 'unavailable');
  assert.deepEqual(notReady.steps, []);
  assert.ok(notReady.issues.some(issue => issue.code === 'ENVIRONMENT_ANALYSIS_NOT_READY'));
  assert.equal(analyzeMemberEnvironments(null).status, 'unavailable');
});
