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
