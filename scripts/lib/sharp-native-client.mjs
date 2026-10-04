import { engineIdentity } from './engine-identity.mjs';
/** Node-only JSON-lines client for the same SharpAstrology core used by browser WASM. */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { adaptSharpChart } from '../../src/lib/chart-engine/sharp-contract.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const project = path.join(root, 'engine-tools/SharpTransitGenerator.csproj');
const assembly = path.join(root, 'engine-tools/bin/Release/net10.0/SharpTransitGenerator.dll');
const sources = [project, 'engine-tools/Program.cs', 'engine-core/TransitCore.cs', 'engine-core/SharpTransitCore.csproj']
  .map(file => path.isAbsolute(file) ? file : path.join(root, file));
const iso = value => new Date(value).toISOString();

export class SharpNativeClient {
  constructor({ dotnet = process.env.DOTNET || 'dotnet', epheRoot = path.join(root, 'public/engine/ephe') } = {}) {
    const signature = engineIdentity().signature;
    const stamp = path.join(path.dirname(assembly), 'engine-signature.txt');
    if (!existsSync(stamp) || readFileSync(stamp, 'utf8') !== signature || !existsSync(assembly) || sources.some(file => statSync(file).mtimeMs > statSync(assembly).mtimeMs)) {
      execFileSync(dotnet, ['build', project, '-c', 'Release', '-v', 'quiet'], { cwd: root, stdio: 'pipe' });
      writeFileSync(stamp, signature);
    }
    this.pending = [];
    this.buffer = '';
    this.stderr = '';
    this.closed = false;
    this.process = spawn(dotnet, [assembly, '--ephe', epheRoot], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
    this.process.unref();
    this.process.stdin.unref();
    this.process.stderr.unref();
    this.process.stdout.unref();
    this.process.stderr.on('data', data => { this.stderr = (this.stderr + data).slice(-8192); });
    this.process.stdout.on('data', data => {
      this.buffer += data;
      let newline;
      while ((newline = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, newline); this.buffer = this.buffer.slice(newline + 1);
        const pending = this.pending.shift();
        if (!pending) continue;
        try {
          const value = JSON.parse(line);
          if (value.error) pending.reject(new Error(`SharpAstrology: ${value.error}`));
          else pending.resolve(value);
        } catch (error) { pending.reject(error); }
      }
      if (!this.pending.length) this.process.stdout.unref();
    });
    const rejectPending = error => {
      this.closed = true;
      for (const pending of this.pending.splice(0)) pending.reject(error);
    };
    this.process.on('error', rejectPending);
    this.process.stdin.on('error', rejectPending);
    this.process.stdout.on('error', rejectPending);
    this.process.on('exit', (code, signal) => rejectPending(new Error(`Sharp native process exited (${code ?? signal}): ${this.stderr}`)));
    this.exitCleanup = () => this.process.kill();
    process.once('exit', this.exitCleanup);
  }

  request(value) {
    if (this.closed) return Promise.reject(new Error('Sharp native client is closed'));
    return new Promise((resolve, reject) => {
      this.pending.push({ resolve, reject });
      this.process.stdout.ref();
      this.process.stdin.write(`${JSON.stringify(value)}\n`, error => {
        if (error) {
          this.closed = true;
          for (const pending of this.pending.splice(0)) pending.reject(error);
        }
      });
    });
  }

  batch(instants) { return this.request({ utcInstants: instants.map(iso) }); }
  async snapshot(instant) { return (await this.batch([instant]))[0]; }
  birth(instant) { return this.request({ birthUtc: iso(instant) }); }

  async close() {
    process.removeListener('exit', this.exitCleanup);
    if (this.closed) return;
    this.process.ref();
    // EOF lets the native process dispose its persistent Swiss file context.
    await new Promise(resolve => {
      this.process.once('exit', resolve);
      this.process.stdout.ref();
      this.process.stdin.end();
    });
  }
}

let sharedClient;
export function nativeClient() { return sharedClient ??= new SharpNativeClient(); }
export async function calculateNativeBirth(date, hour = 12, timezone = 0) {
  const [year, month, day] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day) + (hour - timezone) * 3_600_000).toISOString();
  return adaptSharpChart(await nativeClient().birth(utc), { birthDate: date, birthTime: `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.round((hour % 1) * 60)).padStart(2, '0')}`, timezone });
}

export async function calculateNativeTransit(instant) {
  const { adaptSharpTransit } = await import('../../src/lib/chart-engine/sharp-transit-contract.js');
  return adaptSharpTransit(await nativeClient().snapshot(instant));
}
