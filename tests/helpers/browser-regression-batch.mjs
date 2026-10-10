import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync, createWriteStream, readFileSync } from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const run=process.env.REGRESSION_RUN || new Date().toISOString().replace(/[:.]/g,'-');
const out=path.resolve('artifacts/browser-regression',run);mkdirSync(out,{recursive:true});
const excluded=/^(team-|penta-|font-|reference-|channel-|shared-object|object-detail|lan-preview|sha256-lan|e2e\.mjs|frontend-runtime|place-search|premerge-corrections|share-views)/;
const historical=new Set(['bodygraph-knowledge-regression-e2e.mjs','knowledge-access-e2e.mjs','knowledge-layer-e2e.mjs','knowledge-deviation-e2e.mjs','skin-foundation-e2e.mjs']);
const all=readdirSync('tests').filter(n=>n.endsWith('-e2e.mjs')||n==='e2e.mjs'||n==='deployment-smoke.mjs').sort();
const selected=process.argv.slice(2);
const results=all.map(script=>({script,status:excluded.test(script)?'excluded':historical.has(script)&&!process.env.BASELINE_E2E_URL?'prerequisite':selected.length&&!selected.includes(script)?'not-selected':'pending',reason:excluded.test(script)?'User-assigned to Team/Penta/font/reference/channel owners':historical.has(script)&&!process.env.BASELINE_E2E_URL?'Requires separately served historical revision':undefined}));
function save(){writeFileSync(path.join(out,'results.json'),JSON.stringify({run,base:process.env.E2E_URL,baseline:process.env.BASELINE_E2E_URL,results},null,2)+'\n');}
save();
for(const item of results.filter(x=>x.status==='pending')){
 const start=Date.now();item.status='running';item.log=path.join(out,item.script+'.log');save();
 const log=createWriteStream(item.log);const env={...process.env,CHROME_CHANNEL:process.env.CHROME_CHANNEL||'chromium',E2E_URL:process.env.E2E_URL||'http://127.0.0.1:19963',SKIN_EVIDENCE_DIR:path.join(out,item.script+'-evidence'),CONTRAST_EVIDENCE_DIR:path.join(out,item.script+'-evidence')};
 const child=spawn(process.execPath,['tests/'+item.script],{cwd:root,env,stdio:['ignore','pipe','pipe'],windowsHide:true});child.stdout.pipe(log);child.stderr.pipe(log);
 let timedOut=false;const timer=setTimeout(()=>{timedOut=true;spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});},Number(process.env.REGRESSION_TIMEOUT||120000));
 const code=await new Promise(resolve=>{child.on('error',e=>{log.write(String(e));resolve(-1)});child.on('close',resolve)});clearTimeout(timer);await new Promise(resolve=>log.end(resolve));
 item.status=timedOut?'timeout':code===0?'pass':'fail';item.exitCode=code;item.seconds=Math.round((Date.now()-start)/1000);save();console.log(`${item.status.toUpperCase()} ${item.script} (${item.seconds}s)`);
}
console.log('RESULTS '+path.join(out,'results.json'));
if(results.some(x=>['fail','timeout'].includes(x.status)))process.exitCode=1;
