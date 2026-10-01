import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveUtcOffset, formatUtcOffset } from '../src/lib/timezone.js';

test('birth entry offsets preserve historical DST, half-hour and quarter-hour zones', () => {
  assert.equal(resolveUtcOffset('2000-05-10','12:30','Asia/Shanghai'),8);
  assert.equal(resolveUtcOffset('2000-01-15','12:00','America/Denver'),-7);
  assert.equal(resolveUtcOffset('2000-07-15','12:00','America/Denver'),-6);
  assert.equal(resolveUtcOffset('1942-07-15','12:00','Europe/London'),2);
  assert.equal(resolveUtcOffset('2000-05-10','12:30','Asia/Kolkata'),5.5);
  assert.equal(resolveUtcOffset('2000-05-10','12:30','Asia/Kathmandu'),5.75);
  assert.equal(resolveUtcOffset('2000-05-10','00:00','Asia/Shanghai'),8);
});

test('manual UTC offset labels and invalid-input behavior remain compatible', () => {
  assert.equal(formatUtcOffset(-7),'UTC-7');
  assert.equal(formatUtcOffset(5.5),'UTC+5:30');
  assert.equal(formatUtcOffset(5.75),'UTC+5:45');
  assert.equal(formatUtcOffset(0),'UTC+0');
  assert.throws(()=>resolveUtcOffset('invalid','12:00','Asia/Shanghai'),/Invalid date\/time/);
  assert.throws(()=>resolveUtcOffset('2000-05-10','12:30','Invalid/Zone'),RangeError);
});
