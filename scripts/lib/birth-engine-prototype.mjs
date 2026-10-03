/** Isolated Node prototype. Production providers/default/cache identities are untouched. */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { SharpNativeClient } from './sharp-native-client.mjs';
import { adaptSharpChart } from '../../src/lib/chart-engine/sharp-contract.js';
import { transitInstants } from '../../src/lib/transit-time.js';
import { ENGINE_IDENTITY, ENGINE_SIGNATURE } from '../../src/lib/chart-engine/engine-identity.js';
const root = path.resolve(import.meta.dirname, '../..');
const sha=value=>createHash('sha256').update(value).digest('hex');
export function historicalEngineIdentity(astronomyIdentity) {
  const sharedFiles=['jovian-engine/mechanics/Program.cs','jovian-engine/mechanics/JovianMechanics.csproj','engine-core/TransitCore.cs','src/lib/chart-engine/sharp-contract.js','scripts/lib/birth-engine-prototype.mjs'];
  const sharedSourceHashes=Object.fromEntries(sharedFiles.map(file=>[file,sha(readFileSync(path.join(root,file)))]));
  const identity={...astronomyIdentity, humanDesignVersion:'1.2.0',baseVersion:'0.14.0',contractVersion:'prototype-v1',sharedSourceHashes};
  return {...identity,astronomySignature:astronomyIdentity.engineSignature,engineSignature:sha(JSON.stringify(identity))};
}

export function resolvePrototypeBirth(input) {
  if (typeof input === 'string') input = { utc: input };
  if (input.utc || input.birthUtc) {
    const value = input.utc ?? input.birthUtc;
    if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw new RangeError('UTC input requires an explicit zone');
    const civilDate = /^\d{4}-\d{2}-\d{2}/.exec(value)?.[0];
    const calendar = civilDate && Date.parse(civilDate+'T00:00:00Z');
    if (!civilDate || !Number.isFinite(calendar) || new Date(calendar).toISOString().slice(0,10)!==civilDate) throw new RangeError('Invalid birth date');
    const time = Date.parse(value);
    if (!Number.isFinite(time)) throw new RangeError('Invalid birth instant');
    const utc = new Date(time).toISOString();
    return { utc, birthDate: utc.slice(0,10), birthTime: utc.slice(11,19), timezone: 0 };
  }
  const date = input.birthDate ?? input.date, clock = input.birthTime ?? input.time;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(clock ?? '')) throw new RangeError('Invalid local birth date/time');
  const wall = Date.parse(`${date}T${clock.length === 5 ? clock+':00' : clock}Z`);
  if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0,10) !== date) throw new RangeError('Invalid date');
  let instant, offset;
  if (input.timeZone) {
    const matches = transitInstants(date, clock, input.timeZone);
    if (!matches.length) throw new RangeError('Local time is in a DST gap');
    const selection = input.fold ?? 0;
    if (selection !== 0 && selection !== 1 || !matches[selection]) throw new RangeError('Invalid DST fold');
    ({ instant, offset } = matches[selection]);
  } else {
    offset = input.timezone ?? input.offset;
    if (!Number.isFinite(offset) || Math.abs(offset)>24) throw new RangeError('Provide IANA timeZone or numeric timezone hours');
    instant = wall - offset*3600000;
  }
  // City coordinates are deliberately not an astronomical correction.
  return { utc:new Date(instant).toISOString(), birthDate:date, birthTime:clock, timezone:offset, timeZone:input.timeZone };
}

class MechanicsClient {
  constructor(dotnet) {
    const project = path.join(root,'jovian-engine/mechanics/JovianMechanics.csproj');
    execFileSync(dotnet,['build',project,'-c','Release','-v','quiet'],{stdio:'pipe'});
    this.process = spawn(dotnet,[path.join(root,'jovian-engine/mechanics/bin/Release/net10.0/JovianMechanics.dll')],{stdio:['pipe','pipe','pipe']});
    this.pending=[]; this.buffer=''; this.stderr='';
    this.process.stderr.on('data',v=>this.stderr+=v);
    this.process.stdout.on('data',v=>{
      this.buffer+=v;
      let index;
      while((index=this.buffer.indexOf('\n'))>=0){
        const line=this.buffer.slice(0,index);this.buffer=this.buffer.slice(index+1);
        const pending=this.pending.shift(); if(!pending)continue;
        try{const value=JSON.parse(line); value.error?pending.reject(new Error(value.error)):pending.resolve(value);}catch(error){pending.reject(error);}
      }
    });
    const fail=error=>{for(const p of this.pending.splice(0))p.reject(error);};
    this.process.on('error',fail);this.process.on('exit',code=>fail(new Error(`Mechanics exited ${code}: ${this.stderr}`)));
  }
  request(data){return new Promise((resolve,reject)=>{this.pending.push({resolve,reject});this.process.stdin.write(JSON.stringify(data)+'\n');});}
  async close(){if(this.process.exitCode!==null)return;await new Promise(resolve=>{this.process.once('exit',resolve);this.process.stdin.end();});}
}

export class BirthEnginePrototype {
  constructor({runtime=process.env.JOVIAN_RUNTIME, dotnet=process.env.DOTNET ?? 'dotnet',python=process.env.PYTHON ?? 'python3',epheRoot}={}) {
    this.runtime=runtime;this.dotnet=dotnet;this.python=python;this.epheRoot=epheRoot;
  }
  async mechanics(astronomy,birth) {
    this.sharedMechanics ??= new MechanicsClient(this.dotnet);
    // Historical time label is documented separately; exact TT JD drives all astronomy.
    const designUtc = new Date((astronomy.designModelUt1Jd ?? astronomy.designUtcJd ?? astronomy.designTtJd - (astronomy.designDeltaTDays ?? 0))*86400000-2440587.5*86400000).toISOString();
    return this.sharedMechanics.request({birthUtc:birth.utc,designUtc,personality:astronomy.personality,design:astronomy.design});
  }
  async calculate(input,{engine='modern'}={}) {
    const birth=resolvePrototypeBirth(input);
    if(engine==='both')return {modern:await this.calculate(input,{engine:'modern'}),jovianCompatible:await this.calculate(input,{engine:'jovian-compatible'})};
    if(engine==='modern') {
      this.modern ??= new SharpNativeClient({dotnet:this.dotnet,...(this.epheRoot?{epheRoot:this.epheRoot}:{})});
      const raw=await this.modern.birth(birth.utc);
      return {input:birth,raw,chart:adaptSharpChart(raw,birth),engineIdentity:{id:'modern',...ENGINE_IDENTITY,signature:ENGINE_SIGNATURE}};
    }
    if(engine!=='jovian-compatible')throw new RangeError(`Unknown engine: ${engine}`);
    if(!this.runtime || !existsSync(this.runtime))throw new Error('Set JOVIAN_RUNTIME to the prepared external historical runtime');
    const julianDay=Date.parse(birth.utc)/86400000+2440587.5;
    const astronomy=JSON.parse(execFileSync(this.python,[path.join(root,'jovian-engine/native_backend.py'),'--runtime',this.runtime,'--utc-jd',String(julianDay)],{encoding:'utf8',maxBuffer:16*1024*1024}));
    const raw=await this.mechanics(astronomy,birth);
    const engineIdentity=historicalEngineIdentity(astronomy.identity);
    const chart=adaptSharpChart(raw,birth);
    // Compatibility identity must not inherit the Modern adapter's ephemeris label.
    chart.meta={...chart.meta,ephemeris:'Swiss Ephemeris 1.76.00 / compressed DE406',engine:'jovian-compatible',engineSignature:engineIdentity.engineSignature,timeSemantics:engineIdentity.timeSemantics,designClockMeaning:astronomy.designClockMeaning};
    return {input:birth,raw,chart,astronomy,engineIdentity};
  }
  async close(){await this.modern?.close();await this.sharedMechanics?.close();}
}
