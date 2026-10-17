import { createServer } from 'vite';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function currentBranch() {
  return execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() || 'detached';
}
const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const server = await createServer({
  root,
  // Browser-only test storage: never connects to the installed APP's local API.
  mode: 'static',
  server: { host: '127.0.0.1', port: 9966, strictPort: true, open: false },
  plugins: [{
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
