#!/usr/bin/env python3
"""Read-only profiling proof that the unmodified C Sun path executes swi_bias.
Requires Clang's llvm-profdata/llvm-cov. Profiles remain outside the repository.
"""
import argparse, json, pathlib, subprocess

def main():
 p=argparse.ArgumentParser();p.add_argument('--library',type=pathlib.Path,required=True);p.add_argument('--workdir',type=pathlib.Path,required=True);p.add_argument('--groups',nargs='+',default=['A-SWISS','A-JPL441','A-JPL431']);p.add_argument('--output',type=pathlib.Path,required=True);a=p.parse_args();rows=[]
 for group in a.groups:
  prof=a.workdir/(group+'.profraw');merged=a.workdir/(group+'.profdata');subprocess.run(['xcrun','llvm-profdata','merge','-sparse',str(prof),'-o',str(merged)],check=True)
  data=json.loads(subprocess.check_output(['xcrun','llvm-cov','export',str(a.library),'-instr-profile='+str(merged)]))
  sun=next(f for f in data['data'][0]['functions'] if f['name'].endswith('app_pos_etc_sun'));bias=next(f for f in data['data'][0]['functions'] if f['name']=='swi_bias')
  callsite=[b for b in sun['branches'] if b[0]==4052];model=[b for b in bias['branches'] if b[0]==2229];none=[b for b in bias['branches'] if b[0]==2220]
  assert bias['count']>0 and all(b[4]>0 and b[5]==0 for b in callsite),callsite
  assert model[0][4]==bias['count'] and none[0][4]==0,(model,none)
  rows.append({'group':group,'sunApparentFunctionCallCount':sun['count'],'sunFrameBiasCallSiteSource':'sweph.c:4052-4053','sunFrameBiasConditions':{'notICRSOutput':{'executedTrue':callsite[0][4],'executedFalse':callsite[0][5]},'effectiveDEGreaterOrEqual403':{'executedTrue':callsite[1][4],'executedFalse':callsite[1][5]}},'swiBiasFunctionCallCount':bias['count'],'swiBiasDefaultIAU2006BranchCount':model[0][4],'swiBiasDisabledModelReturnCount':none[0][4],'proofMethod':'LLVM instrumentation on unmodified official C source; source hash and compile flags recorded in environment-c.json'})
 out={'status':'passed','sourceUnmodified':True,'scope':'Source-level dynamic branch/function execution counters, not inferred only from flags. Instrumentation does not modify source equations. Each group executed in its own process/profile.','groups':rows};a.output.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(rows,indent=2))
if __name__=='__main__':main()
