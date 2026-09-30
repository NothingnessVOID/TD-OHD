import test from 'node:test';
import assert from 'node:assert/strict';
import { toDecimalHour } from '../src/lib/chartdata.js';
import { adaptSharpChart } from '../src/lib/chart-engine/sharp-contract.js';
import { getLocale, setLocale } from '../src/lib/i18n.js';
import { definitionName } from '../src/lib/vocabulary.js';

const activation = (gate, line, color, tone, base = 1) =>
  ({ gate, line, color, tone, base, longitude: 30 + gate / 100 });
function raw({ designSun = activation(1, 3, 1, 1), designNode = activation(2, 2, 2, 2),
  personalitySun = activation(3, 1, 3, 3), personalityNode = activation(4, 4, 4, 4) } = {}) {
  return {
    birthUtc: '2088-05-10T04:30:00Z', designUtc: '2088-02-11T06:00:00Z',
    type: 'Reflector', authority: 'Lunar', profile: '1 / 3',
    definition: 'Empty', incarnationCross: 'RightAngleCrossOfExample',
    personality: { sun: personalitySun, earth: activation(5, 1, 1, 1), northNode: personalityNode,
      southNode: activation(6, 1, 1, 1), moon: activation(7, 1, 1, 1),
      mercury: activation(8, 1, 1, 1), venus: activation(9, 1, 1, 1),
      mars: activation(10, 1, 1, 1), jupiter: activation(11, 1, 1, 1),
      saturn: activation(12, 1, 1, 1), uranus: activation(13, 1, 1, 1),
      neptune: activation(14, 1, 1, 1), pluto: activation(15, 1, 1, 1) },
    design: { sun: designSun, earth: activation(16, 1, 1, 1), northNode: designNode,
      southNode: activation(17, 1, 1, 1), moon: activation(18, 1, 1, 1),
      mercury: activation(19, 1, 1, 1), venus: activation(20, 1, 1, 1),
      mars: activation(21, 1, 1, 1), jupiter: activation(22, 1, 1, 1),
      saturn: activation(23, 1, 1, 1), uranus: activation(24, 1, 1, 1),
      neptune: activation(25, 1, 1, 1), pluto: activation(26, 1, 1, 1) },
    channels: [], centers: Object.fromEntries(
      ['Root', 'Sacral', 'Emotions', 'Spleen', 'Heart', 'Self', 'Throat', 'Mind', 'Crown'].map(k => [k, 'None']))
  };
}
const birth = { birthDate: '2088-05-10', birthTime: '12:30', timezone: 8 };

test('all 1440 birth minutes keep exact minute input', () => {
  for (let minute = 0; minute < 1440; minute++) {
    const clock = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
    assert.equal(Math.round(toDecimalHour(clock) * 60), minute);
  }
});

test('Sharp DTO maps four arrow sources and uses Tone for direction', () => {
  for (let tone = 1; tone <= 6; tone++) {
    for (let color = 1; color <= 6; color++) {
      const dto = raw({ designSun: activation(1, 3, color, tone),
        designNode: activation(2, 2, color, tone),
        personalitySun: activation(3, 1, color, tone),
        personalityNode: activation(4, 4, color, tone) });
      const chart = adaptSharpChart(dto, birth);
      for (const [name, side, planet] of [
        ['determination', 'design', 'sun'], ['environment', 'design', 'northNode'],
        ['motivation', 'personality', 'sun'], ['perspective', 'personality', 'northNode']]) {
        assert.equal(chart.variable[name].color, chart.gates[side][planet].color);
        assert.equal(chart.variable[name].tone, chart.gates[side][planet].tone);
        assert.equal(chart.variable[name].arrow, tone <= 3 ? 'left' : 'right');
      }
    }
  }
});

test('adapter preserves chart contract and rejects invalid subdivisions', () => {
  const chart = adaptSharpChart(raw(), birth);
  assert.equal(chart.type.name, 'Reflector');
  assert.equal(chart.authority.name, 'Lunar Authority');
  assert.equal(chart.profile.numbers, '1/3');
  assert.ok(Array.isArray(chart.gates.all));
  assert.ok(Array.isArray(chart.channels));
  assert.equal(chart.centers.definedNames.length, 0);
  assert.equal(chart.positions.design.date, '2088-02-11');
  assert.equal(chart.variable.standardNotation, 'PLR DLL');
  assert.equal(chart.variable.notation, 'PLR DLL');
  assert.throws(() => adaptSharpChart(raw({ designSun: activation(1, 3, 1, 7) }), birth),
    /Invalid SharpAstrology activation/);
});

test('all five Sharp definitions map to the localized TD-OHD contract', () => {
  const cases = [
    ['Empty', 'No Definition', '无定义', '無定義'],
    ['SingleDefinition', 'Single Definition', '一分人定义', '一分人'],
    ['SplitDefinition', 'Split Definition', '二分人定义', '二分人'],
    ['TripleSplit', 'Triple Split Definition', '三分人定义', '三分人'],
    ['QuadrupleSplit', 'Quadruple Split Definition', '四分人定义', '四分人']
  ];
  const locale = getLocale();
  try {
    for (const [definition, expected, simplified, traditional] of cases) {
      const chart = adaptSharpChart({ ...raw(), definition }, birth);
      assert.equal(chart.definition, expected);
      setLocale('zh-CN', { persist: false });
      assert.equal(definitionName(chart.definition), simplified);
      setLocale('zh-Hant', { persist: false });
      assert.equal(definitionName(chart.definition), traditional);
    }
  } finally { setLocale(locale, { persist: false }); }
});

test('Variable notation orders personality before design for every arrow combination', () => {
  for (let mask = 0; mask < 16; mask++) {
    const tones = Array.from({ length: 4 }, (_, bit) => mask & (1 << bit) ? 6 : 1);
    const chart = adaptSharpChart(raw({
      personalitySun: activation(3, 1, 3, tones[0]), personalityNode: activation(4, 4, 4, tones[1]),
      designSun: activation(1, 3, 1, tones[2]), designNode: activation(2, 2, 2, tones[3])
    }), birth);
    const letters = tones.map(tone => tone <= 3 ? 'L' : 'R');
    assert.equal(chart.variable.notation, `P${letters[0]}${letters[1]} D${letters[2]}${letters[3]}`);
    assert.equal(chart.variable.standardNotation, chart.variable.notation);
  }
});

test('numbered Cross names separate the suffix while preserving gates and angle', () => {
  const baseline = adaptSharpChart(raw(), birth).incarnationCross;
  for (const [incarnationCross, name] of [
    ['RightAngleCrossOfTheSphinx4', 'The Sphinx 4'],
    ['RightAngleCrossOfExplanation2', 'Explanation 2']
  ]) {
    const cross = adaptSharpChart({ ...raw(), incarnationCross }, birth).incarnationCross;
    assert.equal(cross.name, name);
    assert.equal(cross.fullName, `Right Angle Cross of ${name} (3/5 | 1/16)`);
    assert.deepEqual(cross.gates, baseline.gates);
    assert.equal(cross.angle, baseline.angle);
  }
});
