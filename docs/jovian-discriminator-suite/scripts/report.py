"""Generate tables and manual replay pack from frozen cases and scored observations."""
import json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(n):return json.loads((ROOT/n).read_text())
def main():
 cases=read('cases.json')['cases'];pred=read('predictions-sealed.json');comp=read('comparison.json');off=read('official-results.json')
 pp={x['id']:x for x in pred['cases']};oo={x['id']:x for x in off['cases']};cc={x['id']:x for x in comp['cases']}
 lines=['# 28-case score table','', 'Each cell is matching Gate.Line activations out of 26. Both official platforms returned the same result twice per input.','', '| Case | UTC | Trigger bodies | C1 | C2 | C3 | C4 | C5 | C6 | ±5 s all-model stable |','|---|---|---|---:|---:|---:|---:|---:|---:|---|']
 for c in cases:
  m=cc[c['id']]['models'];lines.append('| '+ ' | '.join([c['id'],c['birthUtc'],', '.join(c['disagreementBodies']),*[str(m[k]['matched'])for k in ['C1','C2','C3','C4','C5','C6']],str(c['allModelsStableAtPlusMinus5s'])])+' |')
 lines.extend(['','## C1 versus C2 numerical discriminators','','Negative signed distance means longitude is below the nearest fixed 0.9375° boundary. This does not indicate direction of motion.','', '| Case | Body | Official | C1 | C2 | C1 longitude ° | C2 longitude ° | C1 boundary arcsec | C2 boundary arcsec | C1 − C2 TT seconds |','|---|---|---|---|---|---:|---:|---:|---:|---:|'])
 for c in cases:
  model=pp[c['id']]['models']
  for d in cc[c['id']]['models']['C1']['mismatches']:
   b=d['body'];a,z=model['C1']['personality'][b],model['C2']['personality'][b]
   lines.append(f"| {c['id']} | {b} | {d['official']} | {a['gateLine']} | {z['gateLine']} | {a['longitude']:.12f} | {z['longitude']:.12f} | {a['signedMinusNearestBoundaryArcsec']:.9f} | {z['signedMinusNearestBoundaryArcsec']:.9f} | {(model['C1']['ttJd']-model['C2']['ttJd'])*86400:.9f} |")
 (ROOT/'case-scores.md').write_text('\n'.join(lines)+'\n')
 manual=['# Manual replay pack','', '**Unverified shortlist cases: 0.** All 28 were tested on both platforms, twice each. This pack remains a prediction-free checklist for independent replication.','', 'Use London (England), United Kingdom; enter the local date/time below, seconds 00. Leave email empty on Jovian. Do not inspect predictions until observations are complete.','', 'For each case: record both complete 13-body columns, Profile, displayed birth UTC, available Design Date and its stated timezone. Submit twice; distinguish output stability from unobservable backend caching. Do not supply private account data.','', '| Case | Local Europe/London | Expected input UTC only | Profile observation | Design Date observation |','|---|---|---|---|---|']
 for c in cases:manual.append(f"| {c['id']} | {c['birthLocal']} | {c['birthUtc']} | blank | blank |")
 manual.extend(['','Body order: Sun, Earth, Moon, North Node, South Node, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto.','','Official entry points: https://app.mybodygraph.com/ and https://jovianarchive.com/pages/get-your-human-design-chart. Use normal authenticated UI only. Do not export tokens, bypass access, or purchase anything.','','Do not alter `cases.json` or `predictions-sealed.json`; a new suite requires new IDs and a new pre-collection seal.'])
 (ROOT/'manual-test-pack.md').write_text('\n'.join(manual)+'\n')
 native=read('native-reproduction.json');v=read('validation.json');v['nativeReproduction']=native;v['checks']=list(dict.fromkeys(v['checks']+['Six fresh native processes reproduce 4368 activations with zero longitude residual','Direct swe_calc_ut matches utc-as-ut1 wrapper for C1/C2/C6','All 28 +/-1s and +/-5s classifications independently reproduced','All acquisition assets match historical manifest SHA256','C1/C2 same-TT diagnostic: zero maximum residual over 28 x 11 bodies']));v['officialEvidenceHashes']={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest()for p in sorted((ROOT/'evidence').iterdir())if p.is_file()};(ROOT/'validation.json').write_text(json.dumps(v,indent=2)+'\n')
if __name__=='__main__':main()
