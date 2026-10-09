import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adaptSharpChart } from '../src/lib/chart-engine/sharp-contract.js';
import { extractTeamActivations, TEAM_PLANETS, TeamStructureError } from '../src/lib/human-design/team-activation.js';

const snapshot = JSON.parse(readFileSync(new URL('./fixtures/sharp-definition-components.json', import.meta.url))).samples[0];
const sharpMember = () => ({ memberId: 'a', displayName: 'Anonymous',
  chart: adaptSharpChart(snapshot.raw, { birthDate: '1960-01-01', birthTime: '00:00', timezone: 0 }) });

function expectIssue(run, code, path, id = 'a') {
  assert.throws(run, error => error instanceof TeamStructureError && error.code === code &&
    error.memberId === id && error.path === path);
}

test('real anonymous Sharp snapshot adapts to 13+13 complete source records', () => {
  const member = sharpMember();
  const before = structuredClone(member.chart);
  const actual = extractTeamActivations(member);
  assert.equal(actual.length, 26);
  assert.deepEqual(actual.slice(0, 13).map(a => a.planet), [...TEAM_PLANETS]);
  assert.deepEqual(actual.slice(13).map(a => a.side), Array(13).fill('design'));
  assert.deepEqual(actual.find(a => a.side === 'personality' && a.planet === 'sun'), {
    memberId: 'a', side: 'personality', planet: 'sun',
    gate: snapshot.raw.personality.sun.gate, line: snapshot.raw.personality.sun.line
  });
  for (const side of ['personality', 'design']) for (const planet of TEAM_PLANETS) {
    const point = actual.find(a => a.side === side && a.planet === planet);
    assert.equal(point.gate, snapshot.raw[side][planet].gate);
    assert.equal(point.line, snapshot.raw[side][planet].line);
  }
  assert.deepEqual(member.chart, before);
});

test('same gate retains planets, sides and distinct lines', () => {
  const member = sharpMember();
  member.chart.gates.personality.earth.gate = 31;
  member.chart.gates.personality.moon.gate = 31;
  member.chart.gates.design.sun.gate = 31;
  member.chart.gates.design.sun.line = 6;
  const records = extractTeamActivations(member).filter(a => a.gate === 31);
  assert.deepEqual(records.filter(a => a.planet === 'earth' || a.planet === 'moon' || a.side === 'design' && a.planet === 'sun')
    .map(({side,planet,line}) => [side,planet,line]), [
      ['personality','earth',member.chart.gates.personality.earth.line],
      ['personality','moon',member.chart.gates.personality.moon.line],
      ['design','sun',6]
    ]);
});

test('incomplete or corrupt chart reports member and exact field path', () => {
  const cases = [
    [m => { delete m.chart.gates.personality; }, 'MISSING_SIDE', 'chart.gates.personality'],
    [m => { delete m.chart.gates.design; }, 'MISSING_SIDE', 'chart.gates.design'],
    [m => { delete m.chart.gates.personality.sun; }, 'MISSING_ACTIVATION', 'chart.gates.personality.sun'],
    [m => { m.chart.gates.design.earth.gate = 65; }, 'INVALID_GATE', 'chart.gates.design.earth.gate'],
    [m => { m.chart.gates.personality.moon.line = 0; }, 'INVALID_LINE', 'chart.gates.personality.moon.line'],
    [m => { m.chart.gates.design.sun.planet = 'venus'; }, 'INVALID_PLANET', 'chart.gates.design.sun.planet'],
    [m => { m.chart.gates.design.fake = { gate: 1, line: 1 }; }, 'UNKNOWN_PLANET', 'chart.gates.design.fake'],
    [m => { delete m.chart; }, 'INVALID_CHART', 'chart']
  ];
  for (const [damage, code, path] of cases) {
    const member = sharpMember(); damage(member);
    expectIssue(() => extractTeamActivations(member), code, path);
  }
  expectIssue(() => extractTeamActivations({ memberId: '' }), 'INVALID_MEMBER_ID', 'memberId', '');
});
