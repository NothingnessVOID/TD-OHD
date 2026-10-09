import test from 'node:test';
import assert from 'node:assert/strict';
import { PENTA_GATES, PENTA_CHANNELS } from '../src/lib/human-design/penta-catalog.js';

test('official Penta matrix has twelve immutable cells in row-major order', () => {
  assert.deepEqual(PENTA_GATES.map(({ gate, row, column, center }) => [gate, row, column, center]), [
    [31,0,0,'throat'],[8,0,1,'throat'],[33,0,2,'throat'],
    [7,1,0,'g'],[1,1,1,'g'],[13,1,2,'g'],
    [15,2,0,'g'],[2,2,1,'g'],[46,2,2,'g'],
    [5,3,0,'sacral'],[14,3,1,'sacral'],[29,3,2,'sacral']
  ]);
  assert.ok(Object.isFrozen(PENTA_GATES));
  for (const cell of PENTA_GATES) assert.ok(Object.isFrozen(cell));
});

test('six channels have canonical IDs, endpoint positions, center pairs and fixed display order', () => {
  assert.deepEqual(PENTA_CHANNELS.map(({ channelId, gates, endpoints, centers, displayOrder }) =>
    [channelId, [...gates], endpoints.map(p => [p.row, p.column]), [...centers], displayOrder]), [
    ['7-31',[31,7],[[0,0],[1,0]],['throat','g'],0],
    ['1-8',[8,1],[[0,1],[1,1]],['throat','g'],1],
    ['13-33',[33,13],[[0,2],[1,2]],['throat','g'],2],
    ['5-15',[15,5],[[2,0],[3,0]],['g','sacral'],3],
    ['2-14',[2,14],[[2,1],[3,1]],['g','sacral'],4],
    ['29-46',[46,29],[[2,2],[3,2]],['g','sacral'],5]
  ]);
  for (const edge of PENTA_CHANNELS) {
    assert.ok(Object.isFrozen(edge));
    assert.ok(Object.isFrozen(edge.gates));
    assert.ok(Object.isFrozen(edge.endpoints));
    for (const point of edge.endpoints) assert.ok(Object.isFrozen(point));
  }
  assert.deepEqual(PENTA_CHANNELS.map(c => c.channelId).filter(id => ['10-20','10-34','20-34'].includes(id)), []);
});
