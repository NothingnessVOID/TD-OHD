"""Lightweight independent postcollection integrity and score verifier.
Run after compare.py: python3 .../postcollection_integrity.py --complete
Without --complete, partial collection is explicitly reported as partial.
No native libraries, browsers, prediction fitting, or repository writes.
"""
import argparse,hashlib,json,re
from collections import Counter
from datetime import datetime
from pathlib import Path
DOC=Path(__file__).resolve().parents[1];REPO=DOC.parents[1]
ORDER=['sun','earth','moon','northNode','southNode','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];MODELS=['C1','C2','C3','C4','C5','C6']
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def when(t):
 x=datetime.fromisoformat(t.replace('Z','+00:00'));assert x.tzinfo is not None,'Capture time timezone required';return x

def verify(complete):
 seal=read(DOC/'SHA256SUMS.json')
 for folder,key in [(DOC,'files'),(REPO,'inheritedFiles')]:
  for path,digest in seal.get(key,{}).items():assert sha(folder/path)==digest,('seal',path)
 cases=read(DOC/'design-discriminator-cases.json')['cases'];pred=read(DOC/'design-predictions-sealed.json')['cases'];inp={r['id']:r for r in cases};pp={r['id']:r for r in pred}
 assert len(inp)==len(cases)==len(pp)==len(pred);assert set(inp)==set(pp)
 assert len({r['birthUtc']for r in cases})==len(cases)
 old=read(DOC/'existing-official-records.json');oldutc={r['birthUtc']for r in old['cases']}
 assert not oldutc & {r['birthUtc']for r in cases},'Sealed inputs overlap previously observed official UTC'
 manifest=read(DOC/'evidence/SHA256SUMS.json')
 for path,digest in manifest['files'].items():assert sha(DOC/path)==digest,('raw evidence SHA',path)
 paired=(DOC/'evidence/jovian-paired-dom.tsv').read_text().splitlines();expanded=[]
 for line in paired:
  cid,t1,t2,*fields=line.split('\t')
  for repeat,t in enumerate([t1,t2],1):expanded.append('\t'.join([cid,str(repeat),t,*fields]))
 transferred='\n'.join(expanded);assert transferred.isascii()
 assert (DOC/'evidence/jovian-dom-submissions.tsv').read_text()==transferred+'\n'
 fnv=2166136261
 for char in transferred:fnv=((fnv^ord(char))*16777619)&0xffffffff
 assert len(transferred)==14967 and f'{fnv:08x}'=='30758921','Browser transfer checksum mismatch'
 official=read(DOC/'official-results.json');obs=official['cases'];ids=[r['id']for r in obs];utcs=[r['birthUtc']for r in obs]
 source={l.split('\t')[0]:l.split('\t')for l in paired}
 for row in obs:
  cid,t1,t2,utc,p,d,profile,typ,cross,label=source[row['id']]
  captures=row['observations']['Jovian']['captures'];assert [c['capturedAtUtc']for c in captures]==[t1,t2]
  for c in captures:
   assert [c['personality'][b]for b in ORDER]==p.split()and[c['design'][b]for b in ORDER]==d.split()
   assert(c['birthUtcVerified'],c['profile'],c['type'],c['incarnationCross'],c['birthUtcDisplayed'])==(utc,profile,typ,cross,label)
 assert len(ids)==len(set(ids));assert len(utcs)==len(set(utcs));assert set(ids)<=set(inp)
 if complete:assert set(ids)==set(inp),'Official collection incomplete'
 totals={m:Counter()for m in MODELS};platforms=Counter();pairs={m:{'designDiscriminatingCases':[],'C2Wins':[],'otherWins':[],'ties':[]}for m in MODELS if m!='C2'}
 for row in obs:
  cid=row['id'];assert row['birthUtc']==inp[cid]['birthUtc'];assert row['observations'];canon=None
  for platform,o in row['observations'].items():
   captures=o['captures'];assert len(captures)==2
   times=[when(c['capturedAtUtc'])for c in captures];assert times[0]<times[1];assert times[0]>when(seal['sealedAtUtc'])
   for c in captures:
    assert c['birthUtcVerified']==row['birthUtc']
    for s in ['personality','design']:
     assert set(c[s])==set(ORDER);assert all(re.fullmatch(r'(?:[1-9]|[1-5][0-9]|6[0-4])\.[1-6]',v)for v in c[s].values())
    assert c['profile']==c['personality']['sun'].split('.')[1]+'/'+c['design']['sun'].split('.')[1]
   assert all(captures[0][s]==captures[1][s]for s in ['personality','design','profile'])
   if canon:assert all(canon[s]==captures[0][s]for s in ['personality','design','profile'])
   canon=captures[0];platforms[platform]+=1
  for m in MODELS:
   chart=pp[cid]['models'][m];counts={s:sum(chart[s][b]['gateLine']==canon[s][b]for b in ORDER)for s in ['personality','design']}
   t=totals[m];t['designMatched']+=counts['design'];t['personalityMatched']+=counts['personality'];t['matchedActivations']+=sum(counts.values());t['fullCharts']+=sum(counts.values())==26;t['profileMatched']+=chart['profile']==canon['profile']
  for m,pair in pairs.items():
   different=[b for b in ORDER if pp[cid]['models']['C2']['design'][b]['gateLine']!=pp[cid]['models'][m]['design'][b]['gateLine']]
   if different:
    pair['designDiscriminatingCases'].append(cid);a=sum(pp[cid]['models']['C2']['design'][b]['gateLine']==canon['design'][b]for b in different);b=sum(pp[cid]['models'][m]['design'][b]['gateLine']==canon['design'][b]for b in different);pair['C2Wins'if a>b else'otherWins'if b>a else'ties'].append(cid)
 comparison=read(DOC/'comparison.json');n=len(obs)
 assert comparison['newDifferentUtcTested']==n;assert comparison['sealedNewCases']==len(cases)
 assert comparison['pendingOfficialCases']==[r['id']for r in cases if r['id']not in set(ids)]
 assert comparison['platformCaseCounts']==dict(platforms);assert comparison['designPairwiseDiscriminators']==pairs
 for m,t in totals.items():
  published=comparison['totals'][m]
  for k in ['designMatched','personalityMatched','matchedActivations','fullCharts','profileMatched']:assert published[k]==t[k],(m,k)
  for k,v in [('totalDesignActivations',13*n),('totalPersonalityActivations',13*n),('totalActivations',26*n),('totalCharts',n)]:assert published[k]==v,(m,k)
  assert published['designPercent']==(round(t['designMatched']/(13*n)*100,6)if n else None)
 return {'status':'complete_passed'if set(ids)==set(inp)else'partial_passed','officialCases':n,'sealedCases':len(cases),'fieldsPerModel':26*n,'designFieldsPerModel':13*n,'platformCases':dict(platforms),'oldUtcOverlap':0,'sealFilesAndInheritedHashesVerified':True,'scoreRecomputedIndependently':True,'rawEvidenceHashesVerified':True,'pairedExact56OfficialFieldsVerified':True,'browserTransferFNV1a32':'30758921','browserTransferAsciiCharacters':14967,'limitations':['This verifies saved observations and scores; raw UI evidence authenticity requires source captures and provenance review.','UNKNOWN official DesignDate timezone prevents exact UTC timestamp scoring.']}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--complete',action='store_true');p.add_argument('--output',type=Path,default=Path('/tmp/jdd-postcollection-integrity.json'));a=p.parse_args();assert REPO not in a.output.resolve().parents
 report=verify(a.complete);a.output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
