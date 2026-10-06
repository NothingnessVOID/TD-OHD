"""Compare current native Modern output with a built, verified main worktree."""
import argparse,json,pathlib,subprocess,os
p=argparse.ArgumentParser();p.add_argument('--baseline',required=True);p.add_argument('--output',required=True);a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[3];baseline=pathlib.Path(a.baseline)
cases=json.loads((root/'docs/engine-architecture-v1/output-regression.json').read_text())['cases'];utcs=[c['birthUtc'] for c in cases]
requests=[{'birthUtc':u} for u in utcs]+[{'utcInstants':utcs}]
def run(r):
 cmd=[os.environ['DOTNET'],str(r/'engine-tools/bin/Release/net10.0/SharpTransitGenerator.dll'),'--ephe',str(r/'public/engine/ephe')]
 x=subprocess.run(cmd,input='\n'.join(map(json.dumps,requests))+'\n',text=True,capture_output=True,check=True)
 values=list(map(json.loads,x.stdout.splitlines()));assert len(values)==len(requests);assert all('error' not in v for v in values);return values
old,new=run(baseline),run(root)
for i,(before,after) in enumerate(zip(old[:-1],new[:-1])):
 assert after.get('connectedComponents') is not None,utcs[i]
 legacy={k:v for k,v in after.items() if k!='connectedComponents'}
 assert before==legacy,utcs[i]
assert old[-1]==new[-1]
report={'passed':True,'utcCount':len(utcs),'birthCalculationChangesExcludingAdditiveConnectedComponents':0,'transitCalculationChanges':0,'birthContractAddition':'connectedComponents','personalityAndDesignAllSubdivisionAndLongitudeFieldsEqual':True}
pathlib.Path(a.output).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
