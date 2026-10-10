import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../vite.config.js';

// Final public/engine files must remain watched for rebuilt engine refreshes.
test('development watcher excludes locked .NET intermediates, not public engine output', () => {
  assert.deepEqual(config.server.watch.ignored, ['**/bin/**', '**/obj/**']);
});

for (const kind of ['server', 'preview']) {
  test(`${kind} keeps the local preview on the fixed loopback origin`, () => {
    assert.equal(config[kind].host, '127.0.0.1');
    assert.equal(config[kind].port, 9961);
    assert.equal(config[kind].strictPort, true);
  });
}
