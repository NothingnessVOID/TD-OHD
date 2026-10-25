import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createLocalServer } from '../local/server.mjs';

// The Mac install can run without a password gate. These tests pin the three
// states that matter: default password mode, the explicit opt-out, and the
// boundaries that the opt-out must not touch.
const password = 'local-mode-password';
const person = { id: 'mode-test-person', name: '免密模式测试', birthDate: '1990-04-12', birthTime: '08:00', location: { timezone: 8 } };

async function harness() {
  // macOS /var is a symlink; the data root may not sit behind one.
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'ohd-local-mode-')));
  const servers = [];
  const start = async options => {
    const server = createLocalServer({ dataDir: dir, referencePages: false, ...options });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    servers.push(server);
    return `http://127.0.0.1:${server.address().port}`;
  };
  const stop = async () => {
    for (const server of servers.splice(0)) {
      const closed = once(server, 'close');
      server.close(); server.closeAllConnections();
      await closed;
    }
  };
  const request = async (base, path, { data, cookie, origin, method } = {}) => {
    const res = await fetch(base + '/api/local/' + path, {
      method: method || (data ? 'POST' : 'GET'),
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...(origin ? { origin } : {}) },
      ...(data ? { body: JSON.stringify(data) } : {})
    });
    return { status: res.status, body: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0] };
  };
  return { dir, start, stop, request };
}

async function withHarness(options, run) {
  const h = await harness();
  const start = extra => h.start({ ...options, ...extra });
  try { await run({ ...h, start }); }
  finally { await h.stop(); rmSync(h.dir, { recursive: true, force: true }); }
}

const save = { operationId: 'mode-save-1', id: person.id, kind: 'save', data: person };

test('default mode keeps requiring the password for private routes', async () => {
  await withHarness({}, async ({ start, request }) => {
    const base = await start();
    const anonymous = await request(base, 'status');
    assert.equal(anonymous.body.passwordRequired, true);
    assert.equal(anonymous.body.authenticated, false);
    assert.equal(anonymous.body.count, undefined);
    assert.equal((await request(base, 'setup', { data: { password } })).status, 200);
    assert.equal((await request(base, 'status')).body.authenticated, false);
    assert.equal((await request(base, 'backup')).status, 401);
    assert.equal((await request(base, 'sync', { data: { operations: [] } })).status, 401);
  });
});

test('explicit opt-out authenticates status and private APIs without a cookie', async () => {
  await withHarness({ requirePassword: false }, async ({ dir, start, request }) => {
    const base = await start();
    const anonymous = await request(base, 'status');
    assert.equal(anonymous.body.passwordRequired, false);
    assert.equal(anonymous.body.authenticated, true);
    assert.equal(typeof anonymous.body.instance, 'string');
    assert.equal(anonymous.body.count, 0);
    assert.equal(anonymous.cookie, undefined);

    const saved = await request(base, 'sync', { data: { operations: [save] } });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.people.length, 1);
    assert.equal(saved.body.people[0].name, person.name);

    assert.equal((await request(base, 'backup')).body.people.length, 1);

    // Locking must not resurrect the gate, and the stored password stays untouched.
    assert.equal((await request(base, 'logout', { data: {} })).status, 200);
    assert.equal((await request(base, 'status')).body.authenticated, true);
    const inspect = new DatabaseSync(join(dir, 'human-design.sqlite'), { readOnly: true });
    const stored = inspect.prepare("SELECT value FROM settings WHERE key='password'").get();
    assert.equal(stored, undefined);
    inspect.close();
  });
});

test('opt-out keeps host, origin and cross-site boundaries intact', async () => {
  await withHarness({ requirePassword: false }, async ({ start, request }) => {
    const base = await start();
    const port = new URL(base).port;
    // fetch cannot forge Host; a raw request proves the loopback host check still runs.
    const rawStatus = host => new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, path: '/api/local/status', headers: { host } }, res => {
        res.resume(); res.on('end', () => resolve(res.statusCode));
      });
      req.on('error', reject); req.end();
    });
    for (const host of ['evil.example', `evil.example:${port}`]) assert.equal(await rawStatus(host), 403);
    assert.equal(await rawStatus(`127.0.0.1:${port}`), 200);
    assert.equal((await request(base, 'sync', { data: { operations: [] }, origin: 'https://evil.example' })).status, 403);
    assert.equal((await fetch(`${base}/api/local/status`, { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
  });
});

test('a stored password survives opt-out and password mode returns with it', async () => {
  await withHarness({}, async ({ start, stop, request }) => {
    const locked = await start({});
    assert.equal((await request(locked, 'setup', { data: { password } })).status, 200);
    await stop();

    const open = await start({ requirePassword: false });
    assert.equal((await request(open, 'status')).body.passwordRequired, false);
    assert.equal((await request(open, 'status')).body.authenticated, true);
    // The gate is off but the credential is still on disk, ready for restoration.
    assert.equal((await request(open, 'login', { data: { password } })).status, 200);
    await stop();

    const restored = await start({ requirePassword: true });
    assert.equal((await request(restored, 'status')).body.authenticated, false);
    assert.equal((await request(restored, 'login', { data: { password: 'wrong-password' } })).status, 401);
    assert.equal((await request(restored, 'login', { data: { password } })).status, 200);
  });
});

// A malformed config value must never silently open the gate.
test('only the literal boolean false disables the password', async () => {
  for (const value of ['false', 0, 1, null, '', {}, []]) {
    await withHarness({ requirePassword: value }, async ({ start, request }) => {
      assert.equal((await request(await start(), 'status')).body.passwordRequired, true, JSON.stringify(value));
    });
  }
});
