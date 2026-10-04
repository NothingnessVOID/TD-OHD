#!/usr/bin/env python3
"""Compare annual event identity, timestamps, and signatures without overwrites."""
import argparse,collections,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(root,year):
 m=json.loads((root/'manifest.json').read_text());p=root/m['years'][str(year)]['path'];assert sha(p)==m['years'][str(year)]['sha256'];return m,json.loads(p.read_text())
def main():
 p=argparse.ArgumentParser();p.add_argument('--patched',type=Path,required=True);p.add_argument('--year',type=int,default=2026);a=p.parse_args()
 old,od=load(ROOT/'public/transit-data',a.year);new,nd=load(a.patched,a.year)
 shifts=[];changes=[];byBody={}
 for body in range(13):
  oe=[e for e in od['events'] if e[1]==body];ne=[e for e in nd['events'] if e[1]==body]
  byBody[od['pointOrder'][body]]={'oldCount':len(oe),'newCount':len(ne)}
  for i,(o,n) in enumerate(zip(oe,ne)):
   if o[1:]!=n[1:]:changes.append({'body':od['pointOrder'][body],'index':i,'old':o,'new':n})
   elif o[0]!=n[0]:shifts.append({'body':od['pointOrder'][body],'old':o,'patched':n,'shiftSeconds':(n[0]-o[0])/1000})
 summary={'year':a.year,'oldSignature':old['signature'],'newSignature':new['signature'],'old':old['years'][str(a.year)],'patched':new['years'][str(a.year)],'initialActivationChanged':od['initial']!=nd['initial'],'changedTimestampEvents':len(shifts),'plusMinusOneSecond':sum(abs(e['shiftSeconds'])==1 for e in shifts),'largerShifts':sum(abs(e['shiftSeconds'])>1 for e in shifts),'activationSequenceChanges':len(changes),'eventCountChanges':sum(v['oldCount']!=v['newCount'] for v in byBody.values()),'shiftDistributionSeconds':dict(sorted(collections.Counter(e['shiftSeconds'] for e in shifts).items())),'perBody':byBody}
 out=ROOT/f'docs/sharp-swiss-parity-fix/annual-impact-{a.year}.json';out.write_text(json.dumps({'summary':summary,'timestampShifts':shifts,'activationChanges':changes},ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(summary,ensure_ascii=False))
if __name__=='__main__':main()
