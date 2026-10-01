import test from 'node:test';
import assert from 'node:assert/strict';
import { VARIABLE_POSITIONS, variableArrows, variableDirection } from '../src/lib/variable-arrows.js';

test('four Variable keys retain fixed BodyGraph positions and activation sources', () => {
  assert.deepEqual(VARIABLE_POSITIONS.map(({ key, position, source }) => [key, position, source]), [
    ['determination', 'top-left', 'design.sun'],
    ['motivation', 'top-right', 'personality.sun'],
    ['environment', 'bottom-left', 'design.northNode'],
    ['perspective', 'bottom-right', 'personality.northNode']
  ]);
  const variable = Object.fromEntries(VARIABLE_POSITIONS.map(({ key }) => [key, { tone: 2 }]));
  assert.equal(variableArrows(variable).length, 4);
});

for (let tone = 1; tone <= 6; tone++) {
  test(`Tone ${tone} displays the verified ${tone <= 3 ? 'left' : 'right'} direction for every slot`, () => {
    const variable = Object.fromEntries(VARIABLE_POSITIONS.map(({ key }) => [key, { tone }]));
    const expected = tone <= 3 ? '←' : '→';
    for (const item of variableArrows(variable)) assert.equal(item.symbol, expected);
  });
}

test('Color never changes an arrow while Tone stays fixed', () => {
  for (let tone = 1; tone <= 6; tone++) {
    for (let color = 1; color <= 6; color++) {
      assert.equal(variableDirection({ tone, color }), tone <= 3 ? 'left' : 'right');
    }
  }
});

test('contract arrow is authoritative; notation is never decoded', () => {
  assert.equal(variableDirection({ arrow: 'right', tone: 1 }), 'right');
  assert.deepEqual(variableArrows({ notation: 'PLL DRL' }), []);
  assert.deepEqual(variableArrows(undefined), []);
  assert.equal(variableDirection({ tone: 0 }), null);
  assert.equal(variableDirection({ tone: 7 }), null);
});
