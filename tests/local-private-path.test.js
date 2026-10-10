import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, linkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { protectPrivatePath } from '../local/private-path.mjs';
import { createLocalServer } from '../local/server.mjs';

function powershell(script, path) {
  return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "$ErrorActionPreference='Stop'; " + script], {
    env: { ...process.env, OHD_ACL_TEST_PATH: path }, encoding: 'utf8',
  });
}
function inspect(path) {
  return JSON.parse(powershell(`$a=Get-Acl -LiteralPath $env:OHD_ACL_TEST_PATH; @{ protected=$a.AreAccessRulesProtected; current=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value; rules=@($a.Access | ForEach-Object { @{ sid=$_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value; type=$_.AccessControlType.ToString(); rights=$_.FileSystemRights.ToString(); inheritance=[int]$_.InheritanceFlags; propagation=[int]$_.PropagationFlags; inherited=$_.IsInherited } }) } | ConvertTo-Json -Depth 4 -Compress`, path));
}
function assertPrivate(path, directory = false) {
  if (process.platform !== 'win32') return assert.equal(statSync(path).mode & 0o777, directory ? 0o700 : 0o600);
  const acl = inspect(path);
  assert.equal(acl.protected, true);
  assert.deepEqual(acl.rules.map(rule => rule.sid).sort(), [...new Set([acl.current, 'S-1-5-18', 'S-1-5-32-544'])].sort());
  for (const rule of acl.rules) {
    assert.equal(rule.type, 'Allow'); assert.equal(rule.rights, 'FullControl');
    assert.equal(rule.inheritance, directory ? 3 : 0); assert.equal(rule.propagation, 0); assert.equal(rule.inherited, false);
  }
}
function weaken(path, { protectedAcl = true, flagsOnly = false } = {}) {
  if (process.platform !== 'win32') return;
  powershell(`$directory=(Get-Item -LiteralPath $env:OHD_ACL_TEST_PATH).PSIsContainer;
    $a=if ($directory) { New-Object System.Security.AccessControl.DirectorySecurity } else { New-Object System.Security.AccessControl.FileSecurity };
    $a.SetAccessRuleProtection($${protectedAcl}, $false);
    $sids=@([System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value, 'S-1-5-18', 'S-1-5-32-544'${flagsOnly ? '' : ", 'S-1-1-0'"});
    foreach ($sid in $sids) { $r=New-Object System.Security.AccessControl.FileSystemAccessRule([System.Security.Principal.SecurityIdentifier]$sid, 'FullControl', 'None', 'None', 'Allow'); $a.AddAccessRule($r) };
    (Get-Item -LiteralPath $env:OHD_ACL_TEST_PATH -Force).SetAccessControl($a)`, path);
}
async function close(server) {
  if (!server.listening) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); }
  const closed = once(server, 'close'); server.close(); await closed;
}

test('startup repairs existing protected/wide backup, JSON, tmp and SQLite sidecar permissions before opening SQLite', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ohd-private-upgrade-'));
  const backup = join(dir, 'backups');
  mkdirSync(backup); mkdirSync(join(backup, 'nested'));
  const files = ['backups/old.json', 'backups/old.json.tmp', 'backups/nested/archive.json', 'human-design.sqlite-wal', 'human-design.sqlite-shm'];
  try {
    for (const file of files) writeFileSync(join(dir, file), file.startsWith('backups') ? 'fictional' : '', { mode: 0o666 });
    for (const path of [dir, backup, join(backup, 'nested'), ...files.map(file => join(dir, file))]) weaken(path);
    if (process.platform === 'win32') {
      const old = inspect(join(backup, 'old.json'));
      assert.equal(old.protected, true); assert.ok(old.rules.some(rule => rule.sid === 'S-1-1-0'));
      weaken(join(backup, 'old.json.tmp'), { protectedAcl: false });
    }
    // Invalid DB guarantees startup fails at SQLite; permissions must already be repaired.
    writeFileSync(join(dir, 'human-design.sqlite'), 'invalid sqlite fixture', { mode: 0o666 });
    weaken(join(dir, 'human-design.sqlite'));
    assert.throws(() => createLocalServer({ dataDir: dir }), /database|file/i);
    for (const path of [dir, backup, join(backup, 'nested')]) assertPrivate(path, true);
    for (const file of ['human-design.sqlite', ...files]) assertPrivate(join(dir, file));
    assert.equal(readFileSync(join(backup, 'old.json'), 'utf8'), 'fictional');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('Windows fast path repairs missing inheritance and propagation flags', { skip: process.platform !== 'win32' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'ohd-private-flags-'));
  try {
    weaken(dir, { flagsOnly: true });
    assert.ok(inspect(dir).rules.every(rule => rule.inheritance === 0));
    protectPrivatePath(dir, 0o700); assertPrivate(dir, true);
    powershell(`$a=Get-Acl -LiteralPath $env:OHD_ACL_TEST_PATH; foreach ($r in @($a.Access)) { $a.RemoveAccessRuleSpecific($r); $n=New-Object System.Security.AccessControl.FileSystemAccessRule($r.IdentityReference, 'FullControl', 'ContainerInherit, ObjectInherit', 'InheritOnly', 'Allow'); $a.AddAccessRule($n) }; (Get-Item -LiteralPath $env:OHD_ACL_TEST_PATH -Force).SetAccessControl($a)`, dir);
    assert.ok(inspect(dir).rules.every(rule => rule.propagation !== 0));
    protectPrivatePath(dir, 0o700); assertPrivate(dir, true);
    // Repeated protection exercises the valid fast path and inherited child permissions.
    protectPrivatePath(dir, 0o700);
    const child = join(dir, 'new.json'); writeFileSync(child, 'fictional', { mode: 0o600 });
    const acl = inspect(child);
    assert.ok(acl.rules.every(rule => rule.inherited));
    assert.deepEqual(acl.rules.map(rule => rule.sid).sort(), inspect(dir).rules.map(rule => rule.sid).sort());
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('startup refuses nested/root junctions or symlinks and hard links without modifying external targets', () => {
  const parent = mkdtempSync(join(tmpdir(), 'ohd-private-links-'));
  const outside = join(parent, 'outside'); mkdirSync(outside);
  const external = join(outside, 'external.json'); writeFileSync(external, 'unchanged');
  const before = process.platform === 'win32' ? inspect(external) : statSync(external).mode;
  try {
    for (const rootLink of [false, true]) {
      const dir = join(parent, rootLink ? 'root-link' : 'nested');
      if (!rootLink) mkdirSync(dir);
      symlinkSync(outside, rootLink ? dir : join(dir, 'backups'), process.platform === 'win32' ? 'junction' : 'dir');
      assert.throws(() => createLocalServer({ dataDir: dir }), /Unsafe private/);
      assert.equal(existsSync(join(outside, 'human-design.sqlite')), false);
    }
    const dir = join(parent, 'hardlink'); mkdirSync(dir); linkSync(external, join(dir, 'human-design.sqlite'));
    assert.throws(() => createLocalServer({ dataDir: dir }), /Unsafe private/);
    assert.equal(readFileSync(external, 'utf8'), 'unchanged');
    assert.deepEqual(process.platform === 'win32' ? inspect(external) : statSync(external).mode, before);
  } finally { rmSync(parent, { recursive: true, force: true }); }
});

test('backup refuses a junction introduced after startup and never writes to its external target', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'ohd-private-backup-link-'));
  const dir = join(parent, 'data'), outside = join(parent, 'outside'); mkdirSync(outside);
  const external = join(outside, 'keep.json'); writeFileSync(external, 'unchanged');
  const before = process.platform === 'win32' ? inspect(external) : statSync(external).mode;
  let server;
  try {
    server = createLocalServer({ dataDir: dir, referencePages: false });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/local/`;
    const setup = await fetch(base + 'setup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'fictional-password-123' }) });
    assert.equal(setup.status, 200); await setup.json();
    const cookie = setup.headers.get('set-cookie').split(';')[0];
    symlinkSync(outside, join(dir, 'backups'), process.platform === 'win32' ? 'junction' : 'dir');
    const sync = async operations => {
      const res = await fetch(base + 'sync', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ operations }) });
      return { status: res.status, body: await res.json() };
    };
    const saved = await sync([{ operationId: 'save-1', id: 'fictional', kind: 'save', data: { name: 'Fictional ACL test', birthDate: '1990-01-01', birthTime: '12:00', location: { timezone: 0 } } }]);
    assert.equal(saved.status, 200); assert.equal(saved.body.backupWarning, true);
    assert.equal((await sync([{ operationId: 'delete-1', id: 'fictional', kind: 'delete' }])).status, 500);
    assert.equal((await sync([])).body.people.length, 1);
    assert.equal(readFileSync(external, 'utf8'), 'unchanged');
    assert.deepEqual(process.platform === 'win32' ? inspect(external) : statSync(external).mode, before);
    assert.deepEqual(readdirSync(outside), ['keep.json']);
  } finally {
    if (server) await close(server);
    rmSync(parent, { recursive: true, force: true });
  }
});

test('ACL command failure aborts startup before creating a database', { skip: process.platform !== 'win32' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'ohd-private-failure-'));
  const oldPath = process.env.PATH;
  try {
    process.env.PATH = dir;
    assert.throws(() => createLocalServer({ dataDir: dir }), /ENOENT/);
    assert.equal(existsSync(join(dir, 'human-design.sqlite')), false);
  } finally { process.env.PATH = oldPath; rmSync(dir, { recursive: true, force: true }); }
});

test('new SQLite database and live sidecars are private with the default process umask', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ohd-private-new-'));
  try {
    const server = createLocalServer({ dataDir: dir });
    try {
      assertPrivate(dir, true);
      for (const suffix of ['', '-wal', '-shm']) assertPrivate(join(dir, 'human-design.sqlite' + suffix));
    } finally { await close(server); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
