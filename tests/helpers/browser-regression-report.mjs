import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
const root='artifacts/browser-regression';
const dirs=['initial','historical-layer','historical-phase4c','chromium-adaptation-1','chromium-adaptation-2','chromium-navigation','accepted-baseline','chromium-recovered','accepted-recovered','focused-final','foundation-final','skin-final','delve-final'];
const history=new Map();
for(const dir of dirs){let r;try{r=JSON.parse(readFileSync(`${root}/${dir}/results.json`));}catch{continue;}for(const x of r.results){if(!['pass','fail','timeout'].includes(x.status))continue;const a=history.get(x.script)||[];a.push({...x,run:dir});history.set(x.script,a);}}
const excluded=/^(team-|penta-|font-|reference-|channel-|shared-object|object-detail|lan-preview|sha256-lan|e2e\.mjs|frontend-runtime|place-search|premerge-corrections|share-views)/;
const names=readdirSync('tests').filter(n=>n.endsWith('-e2e.mjs')||n==='e2e.mjs'||n==='deployment-smoke.mjs').sort();
let rows=[];for(const name of names){const attempts=history.get(name)||[],last=attempts.at(-1);let status=excluded.test(name)?'DELEGATED':name==='deployment-smoke.mjs'?'PRECONDITION / release owner':last?.status.toUpperCase()||'NOT RUN';rows.push({script:name,status,latestLog:last?`${root}/${last.run}/${name}.log`:null,attempts:attempts.map(x=>({run:x.run,status:x.status,seconds:x.seconds,log:`${root}/${x.run}/${name}.log`}))});}
const report={sourceCommit:'8475a4a12311089f64dbec1ba8b37449cd238537',candidate:'http://127.0.0.1:19963',acceptedBaseline:'http://127.0.0.1:19974',counts:rows.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}),rows};
writeFileSync('tests/browser-regression-results.json',JSON.stringify(report,null,2)+'\n');
console.log(report.counts);
