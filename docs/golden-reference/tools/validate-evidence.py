"""Read-only evidence integrity check. Passing does not mean current Sharp passes Golden."""
from pathlib import Path
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import json, re, hashlib

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT/'golden-cases.json').read_text())
checks = 0

def check(value, detail):
    global checks
    assert value, detail
    checks += 1

byid = {}
for c in data['cases']:
    check(c['id'] not in byid, 'duplicate case ID '+c['id'])
    byid[c['id']] = c
    local = datetime.fromisoformat(c['birthLocal']).replace(tzinfo=ZoneInfo(c['ianaTimezone']))
    utc = datetime.fromisoformat(c['birthUtc'].replace('Z','+00:00'))
    check(local.astimezone(timezone.utc)==utc, 'UTC '+c['id'])
    check(int(local.utcoffset().total_seconds()/60)==c['historicalOffsetMinutes'], 'offset '+c['id'])
    exp = c['expected']
    check(len(exp['activations']['design'])==13 and len(exp['activations']['personality'])==13, 'planet counts '+c['id'])
    p = exp['activations']['personality']['sun'].split('.')[1]
    d = exp['activations']['design']['sun'].split('.')[1]
    check(exp['profile']==p+'/'+d, 'official Profile '+c['id'])
    for side in ['personality','design']:
        for planet, value in exp['activations'][side].items():
            gate,line = map(int,value.split('.'))
            check(1<=gate<=64 and 1<=line<=6, 'Gate.Line '+c['id']+' '+side+' '+planet)
    evidence = json.loads((ROOT/c['evidence']['json']).read_text())
    check((ROOT/c['evidence']['dom']).is_file(), 'missing DOM '+c['id'])
    order=data['planetOrder']
    for side,start in [('design',0),('personality',13)]:
        check(dict(zip(order,evidence['activations'][start:start+13]))==exp['activations'][side], 'fixture drift '+c['id']+' '+side)

check(len(data['mismatchCases'])>=5, 'fewer than five mismatch cases')
for c in data['mismatchCases']:
    b=c['baseline']; exp=c['expected']; boundary=c['boundary']
    check(b['profile']!=exp['profile'], 'not a mismatch '+c['id'])
    diff=[(side,planet) for side in ['design','personality'] for planet in data['planetOrder']
          if b['activations'][side][planet]!=exp['activations'][side][planet]]
    check(diff==[('personality','sun'),('personality','earth')], 'unexpected mismatch scope '+c['id'])
    browser=json.loads((ROOT/b['browserJson']).read_text())
    check(browser['personality'][:2]==[b['activations']['personality']['sun'],b['activations']['personality']['earth']], 'browser personality '+c['id'])
    check(browser['design'][:2]==[b['activations']['design']['sun'],b['activations']['design']['earth']], 'browser design '+c['id'])
    check(b['profile'] in browser['foundation'], 'browser Profile '+c['id'])
    before=byid[c['id']+'-before']; after=byid[c['id']+'-after']
    check(before['expected']['activations']['personality']['sun']==b['activations']['personality']['sun'], 'official before '+c['id'])
    check(after['expected']['activations']['personality']['sun']==exp['activations']['personality']['sun'], 'official after '+c['id'])
    check(boundary['officialLowerExclusiveUtc']==before['birthUtc'] and boundary['officialUpperInclusiveUtc']==c['birthUtc'], 'official bracket '+c['id'])
    check(abs((b['personalitySunLongitude']-b['designSunLongitude'])%360-b['solarArcDegrees'])<1e-10, 'arc '+c['id'])

scan=json.loads((ROOT/'scan/scan-validation.json').read_text())
check(scan['candidateAndWindowRowsChecked']==5473, 'scan count changed')
check(not scan['profileAndSunContractMismatchIds'], 'internal Profile chain mismatch')

result={'evidenceChecksPassed':checks,'evidenceChecksFailed':0,'officialRecords':len(data['cases']),
    'uniqueOfficialUtc':len({c['birthUtc'] for c in data['cases']}),'recordedProductionGoldenFailures':len(data['mismatchCases']),
    'scope':'Evidence consistency only; no engine fix or Golden success is claimed.'}
(ROOT/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
