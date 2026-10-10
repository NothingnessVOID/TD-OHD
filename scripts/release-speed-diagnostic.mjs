import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const evidence=JSON.parse(readFileSync('docs/true-node-parity/results.json'));
const requests=evidence.cases.map(row=>JSON.stringify({id:row.id,birthUtc:row.oracle.birthUtc,oracle:row.oracle})).join('\n')+'\n';
const output=execFileSync('dotnet',['docs/sharp-swiss-parity-fix/scripts/parity-harness/bin/Release/net10.0/SharpAstrology.SwissEphemerides.IntegrationTests.dll','public/engine/ephe'],{input:requests,encoding:'utf8'}).trim().split('\n').map(JSON.parse);
for(let i=0;i<output.length;i++){const r=output[i],f=evidence.cases[i];for(const side of ['personality','design'])for(const [body,v]of Object.entries(r[side])){const ref=f.sharp[side][body],oracle=f.oracle[side][body];if(Math.abs(v.speed-ref.speed)>8e-9)console.log(JSON.stringify({id:r.id,side,body,speed:v.speed,reference:ref.speed,oracle:oracle.speed,diff:Math.abs(v.speed-ref.speed),oracleDiff:Math.abs(v.speed-oracle.speed),time:r.designUtc,refTime:f.sharp.designUtc,oracleTime:f.oracle.designUtc,longitudeDelta:v.longitude-ref.longitude,atOracle:r.sharpAtOracleDesign[body].speed}));}}
