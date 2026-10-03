#!/usr/bin/env python3
"""Diagnostic only: compare observed/model outputs without fitting any values."""
import json
from pathlib import Path

HERE=Path(__file__).resolve().parents[1]
IDS=['G1995-feb','G1995-jun','G2005-jul20','G2015-tight','G2015-feb','G2025-tight','G2025-mar','G1985-tight','G2005-jul11']

def load(name):
    return json.loads((HERE/name).read_text())

def difference(a,b):
    return (a-b+180)%360-180

def main():
    previous=json.loads((HERE.parent/'sharp-webapp/comparison.json').read_text())
    reference={r['id']:r for r in previous['cases']}
    sharp={**load('sharp-jpl-results.json')['groups'],**load('sharp-bias-results.json')['groups']}
    cdata=load('swiss-c-results.json')
    cg=cdata['groups']
    if isinstance(cg,list):cg={g['group']:g for g in cg}
    groups={}
    for key,rows in sharp.items():
        groups[key]={r['id']:{'id':r['id'],'birthUtc':r['birthUtc'],'gateLine':r['sunGateLine'],'longitude':r['sunLongitude'],'longitudeDecimal':r['sunLongitudeDecimal12'],'speed':r['sunLongitudeSpeedDegreesPerDay'],'boundary':r['sunBoundary'],'julianDayUt':r['julianDayUt'],'deltaTSeconds':r['deltaTSeconds'],'julianDayEt':r['julianDayEt']} for r in rows}
    for key,g in cg.items():
        groups[key]={r['id']:{'id':r['id'],'birthUtc':r['birthUtc'],'gateLine':r['personality']['sun']['gateLine'],'longitude':r['personality']['sun']['longitude'],'longitudeDecimal':r['personality']['sun']['longitudeDecimal17'],'speed':r['personality']['sun']['longitudeSpeedDegreesPerDay'],'boundary':r['personality']['sun'],'julianDayUt':r['personality']['julianDayUt'],'deltaTSeconds':r['personality']['deltaTSeconds'],'julianDayEt':r['personality']['julianDayEt']} for r in g.get('cases',[])}
    cases=[]
    for caseid in IDS:
        ref=reference[caseid];jovian=ref['jovian']['activations']['personality']['sun'];td=ref['td8787']['activations']['personality']['sun']
        cells={k:g.get(caseid,{}).get('gateLine') for k,g in groups.items()}
        s=cells['Sharp-se1-current'];cs=cells.get('A-SWISS');cj=cells.get('A-JPL441');sj=cells.get('Sharp-JPL441-current')
        assert s==td==ref['sharpWebApp']['activations']['personality']['sun']
        categories=[]
        if caseid in IDS[:7]:
            if cs==jovian and cs!=s:categories.append(1)
            if cs==s and cs!=jovian:categories.append(2)
            if cj==jovian and cs==s and cs!=jovian:categories.append(3)
            if cs==s==cj:categories.append(4)
        # Result 5 is a longitude comparison even when discrete Gate.Line agrees.
        if caseid in groups.get('A-JPL441',{}):
            a=groups['Sharp-JPL441-current'][caseid];b=groups['A-JPL441'][caseid]
            if a['longitude']!=b['longitude']:categories.append(5)
        cases.append({'id':caseid,'role':ref['role'],'birthUtc':ref['birthUtc'],'jovian':jovian,'mmi':None,'mmiStatus':'blocked','td8787':td,'sharpOfficialWebApp':ref['sharpWebApp']['activations']['personality']['sun'],'personalitySunGateLine':cells,'resultCategories':categories,'result5GateLineDifferent':sj!=cj,'result6And7':'not classified; no MMI chart output'})
    summary={}
    for key,g in groups.items():
        summary[key]={'measuredCases':len(g),'mismatchCaseMatchesJovian':[i for i in IDS[:7] if i in g and g[i]['gateLine']==reference[i]['jovian']['activations']['personality']['sun']],'negativeControlMatchesJovian':[i for i in IDS[7:] if i in g and g[i]['gateLine']==reference[i]['jovian']['activations']['personality']['sun']]}
    pairs={}
    for label,left,right in [('SharpRawMinusCRaw','Sharp-JPL441-current','A-JPL441'),('SharpRawBiasMinusCRaw','Sharp-JPL441-bias','A-JPL441'),('SharpSe1BiasMinusCSe1','Sharp-se1-bias','A-SWISS'),('CRaw441MinusCSe1','A-JPL441','A-SWISS')]:
        rows=[]
        for i in IDS:
            if i not in groups.get(left,{}) or i not in groups.get(right,{}):continue
            a=groups[left][i];b=groups[right][i]
            rows.append({'id':i,'longitudeDifferenceDegrees':difference(a['longitude'],b['longitude']),'longitudeDifferenceMas':difference(a['longitude'],b['longitude'])*3600000,'speedDifferenceDegreesPerDay':a['speed']-b['speed'],'jdUtDifferenceDays':a['julianDayUt']-b['julianDayUt'],'deltaTDifferenceSeconds':a['deltaTSeconds']-b['deltaTSeconds'],'jdEtDifferenceDays':a['julianDayEt']-b['julianDayEt']})
        pairs[label]={'cases':rows,'maxAbsLongitudeDifferenceMas':max((abs(r['longitudeDifferenceMas']) for r in rows),default=None),'maxAbsSpeedDifferenceDegreesPerDay':max((abs(r['speedDifferenceDegreesPerDay']) for r in rows),default=None)}
    result={'schemaVersion':1,'diagnosticOnly':True,'productionModified':False,'installationModified':False,'comparisonMetric':'Personality Sun Gate.Line; Result 5 additionally compares longitude with clocks recorded. Sharp new groups measure Personality13 only; Design/Profile are not inferred. C groups independently measure26 at an88-degree Design root.','caseIds':IDS,'summary':summary,'cases':cases,'numericalPairs':pairs,'resultCategoryMeaning':{'1':'C Swiss matches Jovian while Sharp differs (mismatch cases only)','2':'C Swiss = Sharp != Jovian','3':'C raw441 = Jovian while C Swiss = Sharp != Jovian; same DE controlled','4':'C Swiss = C raw441 = Sharp != Jovian','5':'Sharp raw441 longitude differs from C raw441; Gate.Line may still agree','6':'not testable without actual MMI output','7':'not testable without actual MMI output'}}
    (HERE/'comparison.json').write_text(json.dumps(result,indent=2)+'\n')
    columns=['Sharp-se1-current','Sharp-JPL441-current','Sharp-JPL441-bias','A-SWISS','A-JPL441','A-JPL431']
    table=['| Case | Jovian | MMI | Sharp .se1 | Sharp raw441 | Sharp raw441+bias | C .se1 DE441 | C raw441 | C raw431 |','|---|---|---|---|---|---|---|---|---|']
    for r in cases:table.append('| '+' | '.join([r['id'],r['jovian'],'blocked']+[r['personalitySunGateLine'].get(k) or 'blocked' for k in columns])+' |')
    (HERE/'comparison-table.md').write_text('\n'.join(table)+'\n')
    numerical=['# Numerical comparison','',"Next boundary is the next boundary of each model's **current** line. Signed expected-start distance is a separate column, positive after the Jovian expected line start. Equivalent seconds is a local linear estimate, not an observed or root-solved transition.",'','| Case | Engine/source | Sun longitude ° | next boundary ° | delta to next mas | equivalent seconds | signed expected-start mas | signed expected-start seconds |','|---|---|---:|---:|---:|---:|---:|---:|']
    for i in IDS:
        for key,g in groups.items():
            if i not in g:continue
            r=g[i];b=r['boundary']
            numerical.append(f"| {i} | {key} | {r['longitudeDecimal']} | {b['nextLineBoundaryLongitude']:.12f} | {b['distanceNextMas']:.9f} | {b['equivalentSeconds']:.9f} | {b['signedLongitudeMinusExpectedStartMas']:.9f} | {b['signedSecondsPastExpectedStart']:.9f} |")
    (HERE/'numerical-table.md').write_text('\n'.join(numerical)+'\n')
    print(json.dumps(summary,indent=2))

if __name__=='__main__':main()
