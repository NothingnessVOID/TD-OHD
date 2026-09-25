import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, chmodSync, readFileSync, writeFileSync, renameSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, extname, join, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';

const derive = promisify(scrypt);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const digest = text => createHash('sha256').update(text).digest('hex');
const fail = (status, message) => Object.assign(new Error(message), { status });
const hashPassword = async (password, salt) => (await derive(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })).toString('hex');
function checkPasswordShape(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw fail(400, '密码需为 8 至 128 个字符。');
}
function cleanPerson(p) {
  if (!p || typeof p.id !== 'string' || !/^[\w-]{1,100}$/.test(p.id)) throw fail(400, '人物编号无效。');
  if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 200) throw fail(400, '请填写有效姓名。');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.birthTime || '')) throw fail(400, '出生日期或时间无效。');
  const date = new Date(p.birthDate + 'T12:00:00Z');
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== p.birthDate) throw fail(400, '出生日期无效。');
  const loc = p.location || {};
  if (typeof loc.timezone !== 'number' || !Number.isFinite(loc.timezone) || loc.timezone < -12 || loc.timezone > 14) throw fail(400, '出生时区无效。');
  for (const [key, max] of [['lat', 90], ['lon', 180]]) {
    if (loc[key] != null && (typeof loc[key] !== 'number' || !Number.isFinite(loc[key]) || Math.abs(loc[key]) > max)) throw fail(400, '出生坐标无效。');
  }
  return { id: p.id, name: p.name.trim(), birthDate: p.birthDate, birthTime: p.birthTime,
    timeUnknown: !!p.timeUnknown, location: { timezone: loc.timezone, lat: loc.lat ?? null, lon: loc.lon ?? null,
      iana: typeof loc.iana === 'string' ? loc.iana.slice(0, 120) : null,
      name: typeof loc.name === 'string' ? loc.name.slice(0, 300) : null },
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(), updatedAt: new Date().toISOString() };
}

export function createLocalServer({ dataDir, distDir = join(root, 'dist'), sessionDays = 30, referencePages = true } = {}) {
  if (!dataDir) throw new Error('dataDir is required');
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  chmodSync(dataDir, 0o700);
  const dbPath = join(dataDir, 'human-design.sqlite');
  const db = new DatabaseSync(dbPath);
  chmodSync(dbPath, 0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY, data TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, created INTEGER NOT NULL);`);
  const setting = key => db.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value;
  const putSetting = (key, value) => db.prepare('INSERT OR REPLACE INTO settings VALUES (?,?)').run(key, value);
  if (!setting('instance')) putSetting('instance', randomUUID());
  const people = () => db.prepare('SELECT data FROM people WHERE deleted=0 ORDER BY rowid').all().map(r => JSON.parse(r.data));
  const snapshot = (prefix = 'daily') => {
    const backupDir = join(dataDir, 'backups');
    mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    const stamp = prefix === 'daily' ? new Date().toISOString().slice(0, 10) : new Date().toISOString().replace(/[:.]/g, '-');
    const path = join(backupDir, `${prefix}-${stamp}.json`);
    writeFileSync(path + '.tmp', JSON.stringify({ format: 'ohd-local-backup-v1', exportedAt: new Date().toISOString(), people: people() }, null, 2), { mode: 0o600 });
    renameSync(path + '.tmp', path);
  };
  let failedLogins = 0, lockedUntil = 0;
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
    try {
      const port = server.address()?.port;
      const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
      if (!hosts.has(req.headers.host)) throw fail(403, '仅允许本机访问。');
      const origin = `http://${req.headers.host}`;
      if (req.headers.origin && req.headers.origin !== origin) throw fail(403, '不允许其他网站访问本机资料。');
      const url = new URL(req.url, origin);
      // External links may open the public login shell; private APIs remain same-site.
      if (url.pathname.startsWith('/api/') && req.headers['sec-fetch-site'] === 'cross-site') throw fail(403, '不允许跨站请求。');
      const cookie = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('ohd_session='))?.slice(12);
      const session = cookie ? db.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires>?').get(digest(cookie), Date.now()) : null;
      const auth = () => { if (!session) throw fail(401, '请先输入本机密码。'); };
      const body = async () => {
        if (!req.headers['content-type']?.startsWith('application/json')) throw fail(415, '请求格式需为 JSON。');
        let text = ''; let bytes = 0;
        for await (const part of req) { bytes += part.length; if (bytes > 2_000_000) throw fail(413, '一次传入的资料过多。'); text += part; }
        try { return JSON.parse(text); } catch { throw fail(400, '请求内容无效。'); }
      };
      const issueSession = (remember = true) => {
        const token = randomBytes(32).toString('hex');
        const seconds = remember ? sessionDays * 86400 : 12 * 3600;
        db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
        db.prepare('INSERT INTO sessions VALUES (?,?)').run(digest(token), Date.now() + seconds * 1000);
        res.setHeader('Set-Cookie', `ohd_session=${token}; Path=/; HttpOnly; SameSite=Strict${remember ? `; Max-Age=${seconds}` : ''}`);
      };
      const verify = async password => {
        if (Date.now() < lockedUntil) throw fail(429, '尝试次数较多，请一分钟后重试。');
        checkPasswordShape(password);
        const stored = setting('password');
        const salt = setting('salt');
        const candidate = await hashPassword(password, salt || 'not-configured');
        if (!stored || !timingSafeEqual(Buffer.from(stored, 'hex'), Buffer.from(candidate, 'hex'))) {
          if (++failedLogins >= 8) { lockedUntil = Date.now() + 60000; failedLogins = 0; }
          throw fail(401, '密码不正确，请重试。');
        }
        failedLogins = 0;
        return stored;
      };
      if (url.pathname === '/api/local/health' && req.method === 'GET') return json(200, { app: 'open-human-design-local', ok: true });
      if (url.pathname === '/api/local/status' && req.method === 'GET') return json(200, {
        configured: !!setting('password'), authenticated: !!session,
        ...(session ? { instance: setting('instance'), dataPath: dbPath, count: people().length } : {})
      });
      if (url.pathname === '/api/local/setup' && req.method === 'POST') {
        if (setting('password')) throw fail(409, '已设置密码，请直接登录。');
        const input = await body(); checkPasswordShape(input.password);
        const salt = randomBytes(32).toString('hex'); const hash = await hashPassword(input.password, salt);
        // Recheck after asynchronous hashing: only one initial setup can win.
        if (setting('password')) throw fail(409, '已设置密码，请直接登录。');
        db.exec('BEGIN IMMEDIATE');
        try { putSetting('salt', salt); putSetting('password', hash); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
        issueSession(input.remember !== false); return json(200, { ok: true });
      }
      if (url.pathname === '/api/local/login' && req.method === 'POST') {
        const input = await body(); const verifiedHash = await verify(input.password);
        if (verifiedHash !== setting('password')) throw fail(409, '密码刚刚被修改，请用新密码重试。');
        issueSession(input.remember !== false); return json(200, { ok: true });
      }
      if (url.pathname === '/api/local/logout' && req.method === 'POST') {
        auth(); db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(cookie));
        res.setHeader('Set-Cookie', 'ohd_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'); return json(200, { ok: true });
      }
      if (url.pathname === '/api/local/password' && req.method === 'POST') {
        auth(); const input = await body(); const oldHash = await verify(input.currentPassword); checkPasswordShape(input.password);
        const salt = randomBytes(32).toString('hex'); const hash = await hashPassword(input.password, salt);
        if (oldHash !== setting('password')) throw fail(409, '密码已在其他窗口修改，请重新登录。');
        db.exec('BEGIN IMMEDIATE');
        try { putSetting('salt', salt); putSetting('password', hash); db.exec('DELETE FROM sessions; COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
        issueSession(true); return json(200, { ok: true });
      }
      if (url.pathname === '/api/local/sync' && req.method === 'POST') {
        auth(); const input = await body();
        if (!Array.isArray(input.operations) || input.operations.length > 2000) throw fail(400, '保存请求无效。');
        const ops = input.operations.map(op => {
          if (!op || !/^[\w-]{1,100}$/.test(op.operationId || '') || !/^[\w-]{1,100}$/.test(op.id || '') || !['save','delete','import'].includes(op.kind)) throw fail(400, '保存操作无效。');
          return { ...op, data: op.kind === 'delete' ? null : cleanPerson({ ...op.data, id: op.id }) };
        });
        if (ops.some(o => o.kind === 'delete')) snapshot('before-delete');
        db.exec('BEGIN IMMEDIATE');
        try {
          for (const op of ops) {
            if (db.prepare('SELECT id FROM operations WHERE id=?').get(op.operationId)) continue;
            const old = db.prepare('SELECT * FROM people WHERE id=?').get(op.id);
            // Legacy browser imports never overwrite newer server records or revive deletions.
            if (op.kind === 'import' && old) { /* already migrated */ }
            else if (op.kind === 'delete') db.prepare('INSERT INTO people VALUES (?,?,1) ON CONFLICT(id) DO UPDATE SET deleted=1').run(op.id, old?.data || '{}');
            else db.prepare('INSERT INTO people VALUES (?,?,0) ON CONFLICT(id) DO UPDATE SET data=excluded.data, deleted=0').run(op.id, JSON.stringify(op.data));
            db.prepare('INSERT INTO operations VALUES (?,?)').run(op.operationId, Date.now());
          }
          db.exec('COMMIT');
        } catch (e) { db.exec('ROLLBACK'); throw e; }
        let backupWarning = false;
        if (ops.length) { try { snapshot(); } catch { backupWarning = true; } }
        return json(200, { people: people(), acknowledged: ops.map(o => o.operationId), savedAt: new Date().toISOString(), backupWarning });
      }
      if (url.pathname === '/api/local/backup' && req.method === 'GET') {
        auth(); res.setHeader('Content-Disposition', `attachment; filename="human-design-${new Date().toISOString().slice(0,10)}.json"`);
        return json(200, { format: 'ohd-local-backup-v1', exportedAt: new Date().toISOString(), people: people() });
      }
      if (url.pathname.startsWith('/api/') || url.pathname === '/mcp') throw fail(404, '没有这个接口。');
      if (!['GET','HEAD'].includes(req.method)) throw fail(405, '请求方式不支持。');
      if (referencePages && session && url.pathname === '/chart.svg') {
        const { handleChartSvg } = await import('../worker/og.js');
        const response = await handleChartSvg(new Request(url));
        res.writeHead(response.status, Object.fromEntries(response.headers)); return res.end(Buffer.from(await response.arrayBuffer()));
      }
      if (referencePages && session && url.pathname !== '/' && !extname(url.pathname)) {
        const { handleSeoPage } = await import('../worker/seo.js'); const response = await handleSeoPage(new Request(url));
        if (response) { res.writeHead(response.status, Object.fromEntries(response.headers)); return res.end(await response.text()); }
      }
      const requested = decodeURIComponent(url.pathname);
      let path = resolve(distDir, '.' + requested);
      if (!path.startsWith(resolve(distDir) + sep)) path = join(distDir, 'index.html');
      if (!existsSync(path) || statSync(path).isDirectory()) {
        if (extname(requested)) throw fail(404, '文件不存在。');
        path = join(distDir, 'index.html');
      }
      const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon' }[extname(path)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime + (mime.startsWith('text/') ? '; charset=utf-8' : '') });
      res.end(req.method === 'HEAD' ? undefined : readFileSync(path));
    } catch (error) {
      if (!res.headersSent) json(error.status || 500, { error: error.status ? error.message : '本机服务暂时无法完成操作，请重试。' });
      else res.end();
      if (!error.status) console.error('Local service error:', error.code || error.name);
    }
  });
  server.on('close', () => db.close());
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.umask(0o077);
  const configPath = process.env.OHD_CONFIG || join(homedir(), 'Library/Application Support/OpenHumanDesign/config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const server = createLocalServer(config);
  server.listen(config.port || 8787, '127.0.0.1', () => console.log('Open Human Design local service listening on 127.0.0.1:' + server.address().port));
  for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => { server.close(() => process.exit(0)); server.closeIdleConnections(); });
}
