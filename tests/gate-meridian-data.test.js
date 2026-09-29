import { test } from 'node:test';
import assert from 'node:assert/strict';
import records from '../src/lib/gate-meridian-acupoints.json' with { type: 'json' };
import { gateMeridianAcupoint } from '../src/lib/gate-meridian-data.js';

test('the supplied data covers Gate 1–64 exactly', () => {
  assert.deepEqual(Object.keys(records).map(Number).sort((a, b) => a - b),
    Array.from({ length: 64 }, (_, index) => index + 1));
  for (let gate = 1; gate <= 64; gate += 1) {
    assert.equal(gateMeridianAcupoint(gate), records[String(gate)]);
    assert.equal(gateMeridianAcupoint(String(gate)), records[String(gate)]);
    assert.equal(records[String(gate)].gate, gate);
  }
  for (const gate of [0, 65, -1, 1.5, '24.2', '024', '', null, undefined, NaN]) {
    assert.equal(gateMeridianAcupoint(gate), null, `invalid Gate ${String(gate)}`);
  }
});

test('the supplied acceptance examples retain their original mappings', () => {
  const examples = new Map([
    [24, ['地雷复', '足太阴脾经', '隐白穴', '大趾末节内侧，趾甲根角侧后方约0.1寸。', '坤', '☷', '阴土', '震', '☳', '木', '井穴']],
    [43, ['泽天夬', '手太阴肺经', '经渠穴']],
    [55, ['雷火丰', '足少阳胆经', '阳辅穴']],
    [1, ['乾为天', '手阳明大肠经', '商阳穴']],
    [30, ['离为火', '手少阴心经', '少府穴']]
  ]);
  for (const [gate, [hexagram, meridian, acupoint, location, upper, upperSymbol,
    attribute, lower, lowerSymbol, element, fiveShu]] of examples) {
    const record = gateMeridianAcupoint(gate);
    assert.equal(record.hexagram, hexagram);
    assert.equal(record.meridian, meridian);
    assert.equal(record.acupoint, acupoint);
    if (gate === 24) {
      assert.equal(record.location_short, location);
      assert.deepEqual([record.upper_trigram, record.upper_symbol, record.upper_attribute,
        record.lower_trigram, record.lower_symbol, record.lower_element, record.five_shu_type],
      [upper, upperSymbol, attribute, lower, lowerSymbol, element, fiveShu]);
      assert.equal(record.explanation,
        '第24闸门对应《易经》地雷复。其上卦为坤 ☷，属阴土，对应足太阴脾经；下卦为震 ☳，五行属木。足太阴脾经属于阴经，阴经之木对应井穴，因此定位至隐白穴。');
    }
  }
});

test('records contain only the supplied display fields and no acupoint codes', () => {
  const fields = ['gate', 'hexagram', 'upper_trigram', 'upper_symbol', 'upper_attribute',
    'meridian', 'meridian_yin_yang', 'lower_trigram', 'lower_symbol', 'lower_element',
    'five_shu_type', 'acupoint', 'location_short', 'explanation'].sort();
  for (const record of Object.values(records)) {
    assert.deepEqual(Object.keys(record).sort(), fields);
    for (const field of fields.filter(name => name !== 'gate')) assert.ok(record[field], field);
  }
  const text = JSON.stringify(records);
  assert.doesNotMatch(text, /能量疗愈意义|GB38|SP1|LU8/);
  assert.doesNotMatch(text, /\b(?:GB|SP|LU|LI|ST|KI|HT|SI|BL|LR|PC|TE|SJ|DU|GV|REN|CV)\d{1,2}\b/);
});
