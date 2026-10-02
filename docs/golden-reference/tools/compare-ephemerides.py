import json, re, math, hashlib, os
from pathlib import Path
from datetime import datetime, timezone
import swisseph as swe

ROOT = Path(__file__).resolve().parents[1]
BASE = Path(os.environ['TD_OHD_AUDIT_OUTPUT']).expanduser().resolve()
if BASE == ROOT or ROOT in BASE.parents:
    raise ValueError('TD_OHD_AUDIT_OUTPUT must be outside the repository evidence directory')
BASE.mkdir(parents=True, exist_ok=True)
EV = ROOT / 'browser-evidence'
EPHE = {de: str(Path(os.environ['TD_OHD_' + de]).expanduser().resolve()) for de in ['DE441', 'DE431']}
assert swe.version == '2.10.03', 'Use the pinned Swiss C 2.10.03 version'
expected = {'DE441': {'sepl_18.se1': 'ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66', 'semo_18.se1': '1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7'}, 'DE431': {'sepl_18.se1': '0b7e416e3c1be9e6a0dd1d711dae7f7685793a0e7df13f76363a493dc27b6ea1', 'semo_18.se1': 'ecfa54dbf5bc0b5a9bc3e04ed28629a821e98625eacae38f4070593bba0e2980'}}
for de, files in expected.items():
    for name, sha in files.items():
        assert hashlib.sha256((Path(EPHE[de]) / name).read_bytes()).hexdigest() == sha, f'Wrong ephemeris: {de}/{name}'
MISMATCH_IDS=['G1995-feb','G1995-jun','G2005-jul20','G2015-tight','G2015-feb','G2025-tight','G2025-mar']
GATES=[17,21,51,42,3,27,24,2,23,8,20,16,35,45,12,15,52,39,53,62,56,31,33,7,4,29,59,40,64,47,6,46,18,48,57,32,50,28,44,1,43,14,34,9,5,26,11,10,58,38,54,61,60,41,19,13,49,30,55,37,63,22,36,25]
NAMES=['sun','earth','moon','northNode','southNode','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto']
PLANETS=[swe.SUN,'earth',swe.MOON,swe.TRUE_NODE,'southNode',swe.MERCURY,swe.VENUS,swe.MARS,swe.JUPITER,swe.SATURN,swe.URANUS,swe.NEPTUNE,swe.PLUTO]
UJD=2440587.5; O=3.875; GW=5.625; W=0.9375
def jd(s):return UJD+datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()/86400
def iso(j):return datetime.fromtimestamp((j-UJD)*86400,timezone.utc).isoformat(timespec='microseconds').replace('+00:00','Z')
def err(a,b):return (a-b+180)%360-180
def calc(j,p,flags):
    x,r=swe.calc_ut(j,p,flags)
    if r != flags:raise RuntimeError(f'flags changed {flags} to {r}, body {p}')
    return x
def sun(j,flags):return calc(j,swe.SUN,flags)[0]
def root(target,lo,hi,flags):
    for _ in range(75):
        m=lo+(hi-lo)/2
        if m in (lo,hi):break
        if err(sun(m,flags),target)>=0:hi=m
        else:lo=m
    return (lo+hi)/2
def design(j,flags):return root((sun(j,flags)-88)%360,j-110,j-70,flags)
def gate_line(lon):
    x=(lon-O)%360
    return f'{GATES[int(math.floor(x/GW))]}.{int(math.floor((x%GW)/W))+1}'
def body(j,p,flags):
    if p=='earth':return (sun(j,flags)+180)%360
    if p=='southNode':return (calc(j,swe.TRUE_NODE,flags)[0]+180)%360
    return calc(j,p,flags)[0]
def offset_bound(lon,expected):
    g,l=map(int,expected.split('.')); k=GATES.index(g)
    lowSector=k*GW+(l-1)*W; highSector=lowSector+W
    a=lon-highSector; b=lon-lowSector; shift=360*round((O-(a+b)/2)/360)
    return {'lowerExclusive':a+shift,'upperInclusive':b+shift}
def expected_lower(expected):
    g,l=map(int,expected.split('.'));return (O+GATES.index(g)*GW+(l-1)*W)%360

rows=[];excluded=[]
for f in sorted(EV.glob('*.json')):
    if f.name.startswith('td8787-'):continue
    x=json.load(open(f)); acts=x.get('activations')
    if not isinstance(acts,list) or len(acts)!=26:
        excluded.append({'file':str(f),'reason':'not26activationlist'});continue
    p=x.get('properties',''); ut=None
    if 'Date and Time (UTC)' in p:
        tail=p[p.index('Date and Time (UTC)')+len('Date and Time (UTC)'):]
        m=re.search(r'([A-Z][a-z]+ \d{1,2}, \d{4}, \d{2}:\d{2})',tail)
        if m:ut=datetime.strptime(m.group(1),'%B %d, %Y, %H:%M').replace(tzinfo=timezone.utc).isoformat().replace('+00:00','Z')
    if not ut and f.name=='jovian-1985-1233.json':ut='1985-01-05T12:33:00Z'
    if not ut:
        excluded.append({'file':str(f),'reason':'unknownUTC'});continue
    row={'id':x.get('id',f.stem),'file':str(f),'birthUtc':ut,'utcEvidence':'capturedOfficialUTCProperties' if 'Date and Time (UTC)' in p else 'priorExplicitCaptureAt1985Jan5London1233','officialActivations':acts,'officialSun':{'design':acts[0],'personality':acts[13]},'officialProfile':acts[13].split('.')[1]+'/'+acts[0].split('.')[1],'configurations':{}}
    local=EV/f'td8787-{row["id"]}.json'
    if local.exists():
        l=json.load(open(local));order=[0,1,4,2,3,5,6,7,8,9,10,11,12]
        row['actual8787Activations']=[l[s][i] for s in ['design','personality'] for i in order]
        row['actual8787Sun']={'design':l['design'][0],'personality':l['personality'][0]}
    rows.append(row)

source={};summaryConfigs={}
for de,path in EPHE.items():
    # Explicitly discard prior file handles, body positions, and defaults before changing paths.
    swe.close();swe.set_ephe_path(path);swe.set_tid_acc(swe.TIDAL_AUTOMATIC)
    source[de]={'ephePath':path,'files':[],'loadedFileData':{}}
    for name in ['sepl_18.se1','semo_18.se1']:
        f=Path(path)/name;data=f.read_bytes()
        source[de]['files'].append({'name':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'header':data[:150].decode('ascii',errors='replace')})
    for flags in [258,131330]:
        key=f'{de}_C{flags}';cs=[]
        for row in rows:
            j=jd(row['birthUtc']);d=design(j,flags)
            lons=[body(t,p,flags) for t in [d,j] for p in PLANETS]
            acts=[gate_line(l) for l in lons];diffs=[]
            for i,(a,b) in enumerate(zip(acts,row['officialActivations'])):
                if a!=b:diffs.append({'side':'design' if i<13 else 'personality','point':NAMES[i%13],'computed':a,'official':b})
            sunPair={'design':acts[0],'personality':acts[13]}
            result={'flagsRequestedAndReturned':flags,'designJulianDay':d,'designUtc':iso(d),'solarArcDegrees':(lons[13]-lons[0])%360,'sunLongitude':{'design':lons[0],'personality':lons[13]},'sunGateLine':sunPair,'profile':acts[13].split('.')[1]+'/'+acts[0].split('.')[1],'sunPairMatchesOfficial':sunPair==row['officialSun'],'all26GateLine':acts,'all26MismatchCount':len(diffs),'all26Mismatches':diffs,'deltaTSecondsAtBirth':swe.deltat_ex(j,flags)*86400}
            if row['id'] in MISMATCH_IDS:
                b=root(expected_lower(row['officialSun']['personality']),j-2,j+2,flags)
                result['personalityExpectedLineLowerBoundaryUtc']=iso(b)
                result['personalitySecondsToExpectedLineBoundary']=(b-j)*86400
            row['configurations'][key]=result
            for side in ['design','personality']:
                cs.append({'id':row['id'],'side':side,'longitude':result['sunLongitude'][side],**offset_bound(result['sunLongitude'][side],row['officialSun'][side])})
        lo=max(cs,key=lambda c:c['lowerExclusive']);hi=min(cs,key=lambda c:c['upperInclusive'])
        summaryConfigs[key]={'flags':flags,'recordCount':len(rows),'sunPairMatches':sum(r['configurations'][key]['sunPairMatchesOfficial'] for r in rows),'all26Matches':sum(r['configurations'][key]['all26MismatchCount']==0 for r in rows),'sunPairMismatchIDs':[r['id'] for r in rows if not r['configurations'][key]['sunPairMatchesOfficial']],'all26MismatchIDs':[r['id'] for r in rows if r['configurations'][key]['all26MismatchCount']>0],'singleMandalaOffsetIntersection':{'lowerExclusive':lo['lowerExclusive'],'upperInclusive':hi['upperInclusive'],'feasible':lo['lowerExclusive']<hi['upperInclusive'],'gapIfInfeasibleDegrees':max(0,lo['lowerExclusive']-hi['upperInclusive']),'lowerWitness':lo,'upperWitness':hi}}
    for n in [0,1]:source[de]['loadedFileData'][str(n)]=swe.get_current_file_data(n)
    source[de]['tidalAcceleration']=swe.get_tid_acc()

for row in rows:
    a=row['configurations']['DE441_C258'];b=row['configurations']['DE431_C258']
    row['de431MinusDe441StandardC']={'sunLongitudeDegrees':{s:err(b['sunLongitude'][s],a['sunLongitude'][s]) for s in ['design','personality']},'designUtcDifferenceSeconds':(b['designJulianDay']-a['designJulianDay'])*86400,'deltaTSecondsDifference':b['deltaTSecondsAtBirth']-a['deltaTSecondsAtBirth'],'all26ChangedIndices':[i for i,(x,y) in enumerate(zip(a['all26GateLine'],b['all26GateLine'])) if x!=y]}
    if row['id'] in MISMATCH_IDS:
        row['de431MinusDe441StandardC']['personalityBoundaryDifferenceSeconds']=b['personalitySecondsToExpectedLineBoundary']-a['personalitySecondsToExpectedLineBoundary']

out={'summary':{'cSwissVersion':swe.version,'officialRecordCount':len(rows),'uniqueUtcCount':len(set(r['birthUtc'] for r in rows)),'excluded':excluded,'mandalaOffsetDegrees':O,'scope':'Independent C Swiss Ephemeris diagnostics, exact -88 degree design solar arc, existing captured official Gate.Line comparisons. Actual installed 8787 remains DE441 unchanged. Jovian internal library, flags, files, and time scale remain unknown. No fitted correction adopted. Gate.Line agreement does not prove finer activation subdivisions or Variable.','configurations':summaryConfigs},'sources':source,'sevenMismatchIDs':MISMATCH_IDS,'cases':rows}
json.dump(out,open(BASE/'de431-vs-de441-comparison.json','w'),indent=2)
print(json.dumps(out['summary'],indent=2));print('LOADED FILE DATA',json.dumps(source,indent=2))
for row in rows:
    if row['id'] in MISMATCH_IDS or row['id'] in ['G2005-jul11','G1985-tight','G1995-tight','G1995-apr','G1995-dec']:
        print(row['id'],row['birthUtc'],'official',row['officialSun'],row['officialProfile'])
        for k,v in row['configurations'].items():print(k,v['sunLongitude'],v['sunGateLine'],v['profile'],'26diff',v['all26MismatchCount'],'boundary',v.get('personalitySecondsToExpectedLineBoundary'))
        print('DIFFERENCE',row['de431MinusDe441StandardC'])
