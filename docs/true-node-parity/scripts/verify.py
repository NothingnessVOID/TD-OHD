#!/usr/bin/env python3
"""Nine-case independent Swiss C oracle plus non-node baseline regression."""
import argparse, importlib.util, json, sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[3]
spec=importlib.util.spec_from_file_location('oracle',ROOT/'docs/sharp-swiss-parity-fix/scripts/compare.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def main():
 p=argparse.ArgumentParser();p.add_argument('--library',required=True);a=p.parse_args()
 out=ROOT/'docs/true-node-parity/results.json'
 sys.argv=['compare.py','--library',a.library,'--output',str(out)];m.main()
 current=json.loads(out.read_text());baseline=json.loads((ROOT/'docs/moon-apparent-parity/results.json').read_text())
 before=[r for c in baseline['cases'] for r in c['comparisons'] if r['body'] in ['northNode','southNode']]
 rows=[r for c in current['cases'] for r in c['comparisons']];nodes=[r for r in rows if r['body'] in ['northNode','southNode']]
 other=0
 for c,b in zip(current['cases'],baseline['cases']):
  del c['JOVIAN_COMPATIBILITY']
  for r,old in zip(c['comparisons'],b['comparisons']):
   if r['body'] not in ['northNode','southNode']:
    assert r['sharp']==old['sharp'],(r['case'],r['side'],r['body'],'non-node changed');other+=1
 assert current['summary']['nineFullChartMatches']==9
 assert current['summary']['nineMechanicsMatches']==9
 maxNode=max(abs(r['longitudeResidualMas']) for r in nodes)
 maxSame=max(abs(r['sameEpochResidualMas']) for r in nodes)
 assert maxSame<.001, maxSame # 1 microarcsecond: well above float roundoff, 9400x below baseline.
 current['summary'].update({'nodeMaxBeforeMas':max(abs(r['longitudeResidualMas']) for r in before),'nodeMaxOwnRootResidualMas':maxNode,'nodeMaxSameEpochResidualMas':maxSame,'nodeMaxSpeedResidualDegreesPerDay':max(abs(r['speedResidualDegreesPerDay']) for r in nodes),'nodeMaxBeforeSpeedResidualDegreesPerDay':max(abs(r['speedResidualDegreesPerDay']) for r in before),'nodeComparisons':len(nodes),'nonNodeStatesExactlyUnchanged':other,'scope':'Swiss C only; no external platform compatibility evaluation','remainingBodyDifferences':'Tiny numerical residuals recorded, no further changes'})
 out.write_text(json.dumps(current,indent=2)+'\n');print(json.dumps(current['summary'],indent=2))
if __name__=='__main__':main()
