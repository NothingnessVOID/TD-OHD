"""Convert independent DOM transcription, verifying the browser-side transfer checksum.

This module never imports or reads candidate predictions. Each paired row preserves
two observed submission timestamps and the values verified identical in the browser.
"""
import json, hashlib
from pathlib import Path
from datetime import datetime, timezone
ROOT = Path(__file__).resolve().parents[1]
ORDER = ['sun','earth','moon','northNode','southNode','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto']
URL = 'https://jovianarchive.com/pages/get-your-human-design-chart'

def main():
    source = ROOT / 'evidence/jovian-paired-dom.tsv'
    rows = [line.split('\t') for line in source.read_text().splitlines()]
    assert len(rows) == 28 and all(len(r)==10 for r in rows)
    expanded=[]
    official=[]
    for cid,t1,t2,utc,p,d,profile,typ,cross,label in rows:
        captures=[]
        for repeat,t in enumerate([t1,t2],1):
            expanded.append('\t'.join([cid,str(repeat),t,utc,p,d,profile,typ,cross,label]))
            captures.append({'repeat':repeat,'capturedAtUtc':t,'birthUtcVerified':utc,
                'birthUtcDisplayed':label,'personality':dict(zip(ORDER,p.split())),
                'design':dict(zip(ORDER,d.split())),'profile':profile,'type':typ,
                'incarnationCross':cross,'designDateDisplayed':None,
                'designDateTimezone':'UNKNOWN','fineStructure':'NOT OBSERVED',
                'url':URL,'evidenceFile':'evidence/jovian-paired-dom.tsv'})
        official.append({'id':cid,'birthUtc':utc,'observations':{'Jovian':{'captures':captures}}})
    raw='\n'.join(expanded)
    checksum=2166136261
    for ch in raw:
        checksum=((checksum ^ ord(ch))*16777619)&0xffffffff
    assert len(raw)==14967 and f'{checksum:08x}'=='30758921', 'DOM transfer changed'
    (ROOT/'evidence/jovian-dom-submissions.tsv').write_text(raw+'\n')
    result={'schemaVersion':1,'collection':'Independent normal UI submissions; DOM-visible SVG values and Properties',
        'bodyOrder':ORDER,'capturedCaseCount':28,'submissionCount':56,
        'transferVerification':{'method':'FNV1a32 UTF16 code units (all source characters ASCII)',
            'browserChecksum':'30758921','transcribedChecksum':f'{checksum:08x}',
            'browserCharacters':14967,'transcribedCharacters':len(raw),'status':'passed'},
        'platformAvailability':{'Jovian':{'status':'available','url':URL,'cases':28,'repeatsPerCase':2},
            'myBodyGraph':{'status':'authentication_unavailable_in_isolated_browser','cases':0,
                'url':'https://app.mybodygraph.com/login?redirect=%2F%3Fv%3D2',
                'observedAtUtc':'2026-10-03T14:52:25.309Z','evidenceFile':'evidence/mybodygraph-availability.dom.txt',
                'action':'No credentials supplied, no registration, no Chrome control or session transfer; manual pack prepared'}},
        'evidenceSemantics':{'leftColumn':'Design: mmi-widget shadowRoot svg.orientation-left text',
            'rightColumn':'Personality: mmi-widget shadowRoot svg.orientation-right text',
            'valueFilter':'Rendered text matching Gate.Line, 13 entries each column',
            'birthUtc':'Properties: Date and Time (UTC), checked against input on every submission',
            'profile':'Properties: Profile, recorded independently',
            'repeatStability':'Both submissions sampled separately; exported original 56-record TSV transfer checksum verified'},
        'cases':official}
    (ROOT/'official-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    files={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest()
           for p in sorted((ROOT/'evidence').glob('*')) if p.is_file() and p.name!='SHA256SUMS.json'}
    (ROOT/'evidence/SHA256SUMS.json').write_text(json.dumps({'files':files},indent=2)+'\n')
    print(json.dumps({'cases':28,'captures':56,'transfer':result['transferVerification']}))
if __name__=='__main__':main()
