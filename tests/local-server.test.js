import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { createLocalServer } from '../local/server.mjs';

test('local account: two browser sessions, durable saves, safe legacy merge, auth boundaries and restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ohd-local-test-'));
  let server, base;
  const start = async () => {
    server = createLocalServer({ dataDir: dir, referencePages: false });
    server.listen(0, '127.0.0.1'); await once(server,'listening'); base = `http://127.0.0.1:${server.address().port}`;
  };
  const stop = async () => { const closed = once(server,'close'); server.close(); server.closeAllConnections(); await closed; };
  const request = async (path, { data, cookie, origin, method } = {}) => {
    const res = await fetch(base + '/api/local/' + path, { method: method || (data ? 'POST':'GET'),
      headers: { 'content-type':'application/json', ...(cookie ? { cookie } : {}), ...(origin ? { origin }: {}) },
      ...(data ? { body:JSON.stringify(data) }: {}) });
    return { status:res.status, body:await res.json(), cookie:res.headers.get('set-cookie')?.split(';')[0], headers:res.headers };
  };
  const person = { id:'test-person', name:'跨浏览器测试', birthDate:'1990-06-15', birthTime:'14:30', location:{timezone:8} };
  try {
    await start();
    assert.equal((await request('status')).body.configured, false);
    assert.equal((await request('sync', { data:{ operations:[] } })).status, 401);
    assert.equal((await request('setup', { data:{password:'test-password-123'},origin:'https://example.com' })).status,403);
    const a = await request('setup',{ data:{password:'test-password-123', remember:true} });
    assert.equal(a.status,200); assert.match(a.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
    assert.equal((await request('setup',{data:{password:'another-password'}})).status,409);
    assert.equal((await request('login',{data:{password:'wrong-password'}})).status,401);
    const b = await request('login',{data:{password:'test-password-123'}});
    const save = {operationId:'operation-1',id:person.id,kind:'save',data:person};
    assert.equal((await request('sync',{cookie:a.cookie,data:{operations:[save]}})).status,200);
    assert.equal((await request('sync',{cookie:b.cookie,data:{operations:[]}})).body.people[0].name,person.name);
    const edit = {...save,operationId:'operation-2',data:{...person,name:'更新后的姓名'}};
    await request('sync',{cookie:b.cookie,data:{operations:[edit]}});
    await request('sync',{cookie:a.cookie,data:{operations:[save]}}); // Lost response retry cannot undo the edit.
    const imported = await request('sync',{cookie:a.cookie,data:{operations:[{...save,operationId:'legacy-import',kind:'import'}]}});
    assert.equal(imported.body.people[0].name,'更新后的姓名');
    const invalid = await request('sync',{cookie:a.cookie,data:{operations:[{...save,operationId:'bad',data:{...person,birthDate:'1990-02-30'}}]}});
    assert.equal(invalid.status,400);
    const backup = await request('backup',{cookie:a.cookie}); assert.equal(backup.body.people.length,1);
    assert.ok(readdirSync(join(dir,'backups')).some(n => n.endsWith('.json')));
    assert.equal(statSync(join(dir,'human-design.sqlite')).mode & 0o777,0o600);
    await stop(); await start();
    assert.equal((await request('sync',{cookie:b.cookie,data:{operations:[]}})).body.people[0].name,'更新后的姓名');
    await request('sync',{cookie:b.cookie,data:{operations:[{operationId:'delete-1',id:person.id,kind:'delete'}]}});
    const oldBrowser = await request('sync',{cookie:a.cookie,data:{operations:[{...save,operationId:'legacy-import-2',kind:'import'}]}});
    assert.equal(oldBrowser.body.people.length,0);
    assert.ok(readdirSync(join(dir,'backups')).some(n => n.startsWith('before-delete')));
    const changed = await request('password',{cookie:a.cookie,data:{currentPassword:'test-password-123',password:'new-test-password'}});
    assert.equal(changed.status,200);
    assert.equal((await request('backup',{cookie:b.cookie})).status,401);
    assert.equal((await request('login',{data:{password:'test-password-123'}})).status,401);
    assert.equal((await request('login',{data:{password:'new-test-password'}})).status,200);
    assert.equal((await request('logout',{cookie:changed.cookie,data:{}})).status,200);
    assert.equal((await request('backup',{cookie:changed.cookie})).status,401);
    const inspect = new DatabaseSync(join(dir,'human-design.sqlite'),{readOnly:true});
    const hashed = inspect.prepare("SELECT value FROM settings WHERE key='password'").get().value;
    assert.match(hashed,/^[a-f0-9]{128}$/); inspect.close();
    assert.ok(!readFileSync(join(dir,'human-design.sqlite')).includes(Buffer.from('new-test-password')));
  } finally { if (server?.listening) await stop(); rmSync(dir,{recursive:true,force:true}); }
});

test('desktop observations persist across sessions and restore conflicts as copies', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ohd-observation-test-'));
  let server, base;
  const start = async () => {
    server = createLocalServer({ dataDir: dir, referencePages: false });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    base = `http://127.0.0.1:${server.address().port}`;
  };
  const stop = async () => { const closed = once(server, 'close'); server.close(); server.closeAllConnections(); await closed; };
  const request = async (path, { method = 'GET', cookie, data } = {}) => {
    const response = await fetch(base + '/api/local/' + path, { method,
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      ...(data ? { body: JSON.stringify(data) } : {}) });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  const note = { id: 'test-note', observedAt: '2026-09-27T01:00:00.000Z', displayZone: 'Asia/Shanghai',
    personId: null, alias: 'anonymous', raw: 'Initial experience', interpretation: '', event: '', tags: [], snapshot: null,
    createdAt: '2026-09-27T01:00:00.000Z', updatedAt: '2026-09-27T01:00:00.000Z', restoredFrom: null };
  try {
    await start();
    assert.equal((await request('observations')).status, 401);
    const setup = await request('setup', { method: 'POST', data: { password: 'test-password-123' } });
    assert.equal((await request('observations', { method: 'PUT', cookie: setup.cookie, data: note })).status, 200);
    assert.equal((await request('observations', { cookie: setup.cookie })).body.records[0].raw, 'Initial experience');
    assert.equal((await request('backup', { cookie: setup.cookie })).body.observations.length, 1);
    await stop(); await start();
    const login = await request('login', { method: 'POST', data: { password: 'test-password-123' } });
    assert.equal((await request('observations', { cookie: login.cookie })).body.records.length, 1);
    const restored = await request('observations/import', { method: 'POST', cookie: login.cookie,
      data: { format: 'td-ohd-observations-v1', records: [{ ...note, raw: 'Second version' }] } });
    assert.deepEqual(restored.body.counts, { add: 0, conflict: 1, unchanged: 0 });
    const records = (await request('observations', { cookie: login.cookie })).body.records;
    assert.equal(records.length, 2);
    assert.equal(records.find(item => item.id === note.id).raw, 'Initial experience');
    assert.equal(records.find(item => item.restoredFrom === note.id).raw, 'Second version');
    assert.equal((await request('observations/test-note', { method: 'DELETE', cookie: login.cookie })).status, 200);
    assert.equal((await request('observations', { cookie: login.cookie })).body.records.length, 1);
    assert.ok(readdirSync(join(dir, 'backups')).some(name => name.startsWith('before-observation-delete')));
  } finally { if (server?.listening) await stop(); rmSync(dir, { recursive: true, force: true }); }
});

test('observation table migrates additively without changing legacy people', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ohd-legacy-migration-'));
  const path = join(dir, 'human-design.sqlite');
  try {
    const before = new DatabaseSync(path);
    before.exec('CREATE TABLE people (id TEXT PRIMARY KEY, data TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0)');
    before.prepare('INSERT INTO people VALUES (?,?,0)').run('legacy-person', JSON.stringify({ id: 'legacy-person', name: 'Synthetic legacy record' }));
    before.close();
    const server = createLocalServer({ dataDir: dir, referencePages: false });
    server.close();
    const after = new DatabaseSync(path, { readOnly: true });
    assert.equal(JSON.parse(after.prepare('SELECT data FROM people WHERE id=?').get('legacy-person').data).name, 'Synthetic legacy record');
    assert.equal(after.prepare('SELECT COUNT(*) AS count FROM observations').get().count, 0);
    assert.equal(after.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    after.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
