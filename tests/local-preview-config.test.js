import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../vite.config.js';

// Final public/engine files must remain watched for rebuilt engine refreshes.
test('development watcher excludes locked .NET intermediates, not public engine output', () => {
  assert.deepEqual(config.server.watch.ignored, ['**/bin/**', '**/obj/**']);
});

test('LAN development keeps environment and private research files denied', () => {
  assert.ok(config.server.fs.deny.includes('.env.*'));
  assert.ok(config.server.fs.deny.includes('**/.git/**'));
  assert.ok(config.server.fs.deny.includes('**/docs/handoff/**'));
  assert.notEqual(config.server.allowedHosts, true);
});

for (const kind of ['server', 'preview']) {
  test(`${kind} serves trusted-LAN preview on the fixed port`, () => {
    assert.equal(config[kind].host, '0.0.0.0');
    assert.equal(config[kind].port, 9961);
    assert.equal(config[kind].strictPort, true);
  });
}
