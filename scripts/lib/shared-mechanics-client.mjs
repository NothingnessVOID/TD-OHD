/** Local shared Sharp mechanics transport; no astronomy is calculated here. */
import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');

export class SharedMechanicsClient {
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
