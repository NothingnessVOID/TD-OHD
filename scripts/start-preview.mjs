import { createServer } from 'vite';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { homedir } from 'node:os';
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
const peopleDir = path.join(homedir(), 'Library/Application Support/OpenHumanDesign/preview-data');
mkdirSync(peopleDir, { recursive: true, mode: 0o700 });
const peopleFile = path.join(peopleDir, 'people.json');
if (!existsSync(peopleFile)) writeFileSync(peopleFile, '[]\n', { mode: 0o600 });
const readPeople = () => JSON.parse(readFileSync(peopleFile, 'utf8'));
function writePeople(people) {
  const temporary = peopleFile + '.tmp';
  writeFileSync(temporary, JSON.stringify(people, null, 2) + '\n', { mode: 0o600 });
  renameSync(temporary, peopleFile);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function currentBranch() {
  return execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() || 'detached';
}
const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const server = await createServer({
  root,
  // Only the people adapter is shared; installed APP data and preferences stay separate.
  mode: 'static',
  server: { host: '127.0.0.1', port: 9966, strictPort: true, open: false },
  plugins: [{
    name: 'local-preview-people',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === './profile-storage.js' && importer?.split('?')[0].endsWith('/src/lib/people.js')) {
        return path.join(root, 'scripts/preview-people-store.mjs');
      }
    },
    configureServer(server) {
      server.middlewares.use('/__preview/people', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        const host = req.headers.host;
        if (!['127.0.0.1:9966', 'localhost:9966'].includes(host) || (req.headers.origin && req.headers.origin !== `http://${host}`) || req.headers['sec-fetch-site'] === 'cross-site') {
          res.statusCode = 403; return res.end('{"error":"仅允许本机预览访问"}');
        }
        try {
          if (req.method === 'GET') return res.end(JSON.stringify(readPeople()));
          if (req.method !== 'POST' || !req.headers['content-type']?.startsWith('application/json')) { res.statusCode = 405; return res.end('{}'); }
          let body = '';
          for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 200000) throw new Error('请求过大'); }
          const operation = JSON.parse(body), people = readPeople();
          const person = operation.person;
          if (operation.kind === 'save' && person && typeof person.id === 'string' && typeof person.name === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(person.birthDate) && /^\d{2}:\d{2}$/.test(person.birthTime) && Number.isFinite(person.location?.timezone)) {
            const index = people.findIndex(item => item.id === person.id);
            if (index < 0) people.push(person); else people[index] = person;
          } else if (operation.kind === 'delete' && typeof operation.id === 'string') {
            const index = people.findIndex(item => item.id === operation.id);
            if (index >= 0) people.splice(index, 1);
          } else throw new Error('人物请求无效');
          writePeople(people); res.end('{"ok":true}');
        } catch (error) { res.statusCode = 400; res.end(JSON.stringify({ error: error.message })); }
      });
    },
  }, {
    name: 'local-preview-identity',
    transformIndexHtml(html) {
      return html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/, `<title>开发预览 9966 · ${escape(currentBranch())} · TD-OHD</title>`);
    },
  }],
});
await server.listen();
console.log(`Development preview: http://127.0.0.1:9966/ · ${currentBranch()}`);
console.log('Source changes refresh automatically. Personal data on 9961 is separate.');
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => { await server.close(); process.exit(0); });
}
