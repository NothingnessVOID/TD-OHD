#!/usr/bin/env python3
"""Run the existing independent Swiss C/root harness, then enforce lunar-only gates."""
import importlib.util, json, sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[3]
def main():
 p=ROOT/'docs/sharp-swiss-parity-fix/scripts/compare.py'
 spec=importlib.util.spec_from_file_location('swiss_parity',p);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
 out=ROOT/'docs/moon-apparent-parity/results.json'
 sys.argv.extend(['--output',str(out)]);mod.main()
 j=json.loads(out.read_text());old=json.loads((ROOT/'docs/sharp-swiss-parity-fix/results.json').read_text())
 moon=[x for r in j['cases'] for x in r['comparisons'] if x['body']=='moon']
 baseline=[x for r in old['cases'] for x in r['comparisons'] if x['body']=='moon']
 changed=[]
 for a,b in zip(j['cases'],old['cases']):
  a.pop('JOVIAN_COMPATIBILITY',None)
  for side in ['personality','design']:
   for body in a['sharp'][side]:
    if body!='moon' and a['sharp'][side][body]!=b['sharp'][side][body]:changed.append([a['id'],side,body])
 summary=j['summary'];summary.update({'moonBeforeMaxResidualArcsec':max(abs(x['longitudeResidualArcsec']) for x in baseline),
 'moonMaxResidualArcsec':max(abs(x['longitudeResidualArcsec']) for x in moon),
 'moonMaxSameEpochResidualMas':max(abs(x['sameEpochResidualMas']) for x in moon),
 'moonMaxSpeedResidualDegreesPerDay':max(abs(x['speedResidualDegreesPerDay']) for x in moon),
 'nonMoonNativeOutputsChanged':changed,
 'trueNodeMaxResidualMas':max(abs(x['longitudeResidualMas']) for r in j['cases'] for x in r['comparisons'] if x['body']=='northNode'),
 'remainingBodyDifferences':'True Node residual retained unchanged; no node algorithm edits. Own-Design-root Moon residual includes the existing <=0.161 ms independent root difference.'})
 assert not changed,changed
 assert summary['nineFullChartMatches']==9
 assert summary['nineGateLineMatches']==9 and summary['nineMechanicsMatches']==9
 assert summary['moonMaxSameEpochResidualMas']<.001
 assert summary['moonMaxResidualArcsec']<.0001
 assert summary['moonMaxSpeedResidualDegreesPerDay']<1e-8
 out.write_text(json.dumps(j,indent=2)+'\n');print(json.dumps(summary))
if __name__=='__main__':main()
