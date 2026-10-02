import json,re,math,hashlib,tarfile,os
from pathlib import Path
from datetime import datetime,timezone
import swisseph as s
BASE = Path(os.environ['TD_OHD_AUDIT_OUTPUT']).expanduser().resolve()
H = Path(os.environ['TD_OHD_HISTORICAL_SOURCES']).expanduser().resolve()
ROOT = Path(__file__).resolve().parents[1]
if BASE == ROOT or ROOT in BASE.parents:
    raise ValueError('Write diagnostic output outside the evidence directory')
data=json.load(open(BASE/'de431-vs-de441-comparison.json'))
old=(H/'swephlib.c').read_text();modern=Path(os.environ['TD_OHD_CURRENT_SWEPHLIB']).expanduser().read_text()
def table(src):
 a=re.search(r'static TLS double dt\[TABSIZ_SPACE\] = \{(.+?)\n\};',src,re.S).group(1)
 a=re.sub(r'/\*.*?\*/','',a,flags=re.S)
 return [float(x) for x in re.findall(r'[-+]?(?:\d+(?:\.\d*)?|\.\d+)',a)]
assert hashlib.sha256(old.encode()).hexdigest() == '0b21ed2288e798045d08d754c6401aecf4143b40424610401387b4ceb0f3b22b', 'Wrong historical swephlib.c'
assert hashlib.sha256(modern.encode()).hexdigest() == 'd41eb2f396163fedd574749de02a25e8547b4e1e4c66783d47ccc0c7e4885a05', 'Wrong current swephlib.c'
assert s.version == '2.10.03', 'Use pinned C2.10.03'
TOLD=table(old);TNEW=table(modern)
def dt(j,table):
 Y=2000+(j-2451544.5)/365.25;p=math.floor(Y);iy=int(p-1620);p=Y-p
 ans=table[iy]+p*(table[iy+1]-table[iy]);d=[];k=iy-2
 for i in range(5):d.append(table[k+1]-table[k] if k>=0 and k+1<len(table) else 0);k+=1
 for i in range(4):d[i]=d[i+1]-d[i]
 B=.25*p*(p-1);ans+=B*(d[1]+d[2])
 for i in range(3):d[i]=d[i+1]-d[i]
 B=2*B/3;ans+=(p-.5)*B*d[1]
 for i in range(2):d[i]=d[i+1]-d[i]
 B=.125*B*(p+1)*(p-2);ans+=B*(d[0]+d[1])
 # All audited birth/design epochs are after1955: adjust_for_tidacc applies no change.
 assert Y>=1955
 return ans
def julday(ut):return 2440587.5+datetime.fromisoformat(ut.replace('Z','+00:00')).timestamp()/86400
def iso(j):return datetime.fromtimestamp((j-2440587.5)*86400,timezone.utc).isoformat(timespec='microseconds').replace('+00:00','Z')
GATES=[17,21,51,42,3,27,24,2,23,8,20,16,35,45,12,15,52,39,53,62,56,31,33,7,4,29,59,40,64,47,6,46,18,48,57,32,50,28,44,1,43,14,34,9,5,26,11,10,58,38,54,61,60,41,19,13,49,30,55,37,63,22,36,25]
PLANETS=[s.SUN,'earth',s.MOON,s.TRUE_NODE,'southNode',s.MERCURY,s.VENUS,s.MARS,s.JUPITER,s.SATURN,s.URANUS,s.NEPTUNE,s.PLUTO]
def gate(l):
 x=(l-3.875)%360;return f'{GATES[int(x//5.625)]}.{int((x%5.625)//.9375)+1}'
def calc_old_dt(j,p):
 x,r=s.calc(j+dt(j,TOLD)/86400,p,258)
 assert r==258
 return x[0]
def body(j,p):
 if p=='earth':return (calc_old_dt(j,s.SUN)+180)%360
 if p=='southNode':return (calc_old_dt(j,s.TRUE_NODE)+180)%360
 return calc_old_dt(j,p)
def design(j):
 target=(calc_old_dt(j,s.SUN)-88)%360;lo=j-110;hi=j-70
 for i in range(75):
  m=(lo+hi)/2
  if m in [lo,hi]:break
  if (calc_old_dt(m,s.SUN)-target+180)%360-180>=0:hi=m
  else:lo=m
 return (lo+hi)/2
rows=[];maxModernError=0
s.close();s.set_ephe_path(str(Path(os.environ['TD_OHD_DE431']).expanduser()));s.set_tid_acc(s.TIDAL_AUTOMATIC)
for case in data['cases']:
 j=julday(case['birthUtc']);d=case['configurations']['DE431_C258']['designJulianDay']
 check=[]
 for side,t in [('birth',j),('design',d)]:
  modernC=s.deltat_ex(t,258)*86400;inter=dt(t,TNEW);maxModernError=max(maxModernError,abs(inter-modernC));assert abs(inter-modernC)<1e-11
  check.append({'epoch':side,'utc':iso(t),'c21003DeltaTSeconds':modernC,'table21003DeltaTSeconds':inter,'table208DeltaTSeconds':dt(t,TOLD),'oldMinusModernSeconds':dt(t,TOLD)-modernC})
 dOld=design(j);acts=[gate(body(t,p)) for t in [dOld,j] for p in PLANETS]
 diffs=[{'index':i,'computed':a,'official':b} for i,(a,b) in enumerate(zip(acts,case['officialActivations'])) if a!=b]
 rows.append({'id':case['id'],'birthUtc':case['birthUtc'],'deltaT':check,'sensitivityOnly':{'configuration':'C2.10.03 standard258 + DE431, replacing default DeltaT with historical2.08 table interpolation','designUtc':iso(dOld),'sun':{'design':acts[0],'personality':acts[13]},'profile':acts[13].split('.')[1]+'/'+acts[0].split('.')[1],'all26GateLine':acts,'all26MismatchCount':len(diffs),'all26Mismatches':diffs}})
summary={'scope':'Historical DeltaT-table-only sensitivity. This does not run a completeC2.08 kernel or prove Jovian configuration. CurrentC kernel+DE431 fixed, old default table interpolation reconstructed exactly; modern implementation validated against C deltat_ex at all47 birth and design epochs. No fitted values and no production changes.','historicalSource':json.load(open(H/'source-manifest.json')),'historicalSourceTabEnd':2027,'currentSourceTabEnd':2028,'table21003VsActualCMaxDifferenceSeconds':maxModernError,'officialRecordCount':len(rows),'all26Matches':sum(r['sensitivityOnly']['all26MismatchCount']==0 for r in rows),'all26MismatchIDs':[r['id'] for r in rows if r['sensitivityOnly']['all26MismatchCount']>0],'residualFourAll26NowMatchIDs':[r['id'] for r in rows if r['id'] in ['G2015-tight','G2015-feb','G2025-tight','G2025-mar'] and not r['sensitivityOnly']['all26MismatchCount']],'conclusion':'Authentic2.08 historical table is identical near2015; gives exactlyzero shift at both2015 births/designs and leaves both mismatches. Near2025 its older forecast advances by about3seconds and can match both2025 cases. Thus this specific oldDeltaT-table-only hypothesis cannot explain all four residual UTCs or allofficial results.'}
json.dump({'summary':summary,'cases':rows},open(BASE/'historical-deltat-208-vs-21003.json','w'),indent=2)
print(json.dumps(summary,indent=2))
for r in rows:
 if r['id'] in ['G2015-tight','G2015-feb','G2025-tight','G2025-mar']:print(json.dumps(r,indent=2))
