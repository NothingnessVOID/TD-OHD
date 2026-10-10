// Materialize immutable Git snapshots inside ignored artifacts; never create another worktree.
import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const [revision,port='19971']=process.argv.slice(2);if(!revision)throw Error('revision required');
const root=process.cwd(),resolved=spawnSync('git',['rev-parse',revision],{encoding:'utf8'});if(resolved.status)throw Error(resolved.stderr);
const commit=resolved.stdout.trim(),target=path.join(root,'artifacts/browser-regression/baselines',commit);
mkdirSync(target,{recursive:true});
if(!existsSync(path.join(target,'baseline-provenance.json'))){
 const archive=path.join(target,'snapshot.tar');const a=spawnSync('git',['archive','--format=tar','--output',archive,commit,'src','public','index.html','package.json','vite.config.js']);if(a.status)throw Error(String(a.stderr));
 const x=spawnSync('tar',['-xf',archive,'-C',target]);if(x.status)throw Error(String(x.stderr));
}
for(const [dest,source]of [['node_modules','node_modules'],['public/engine','public/engine']]){
 const d=path.join(target,dest);if(!existsSync(d))symlinkSync(path.join(root,source),d,'junction');
}
writeFileSync(path.join(target,'baseline-provenance.json'),JSON.stringify({commit,port,source:root,reused:['node_modules','public/engine'],purpose:'Historical UI E2E baseline; immutable source archive, existing runtime assets'},null,2));
console.log(JSON.stringify({commit,target,port}));
const result=spawnSync(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',port,'--strictPort'],{cwd:target,stdio:'inherit',windowsHide:true});process.exitCode=result.status||0;
