"""Compare captured official WebApp DOM outputs with existing Golden/8787 evidence.

No network or calculation call: this validates evidence, not an engine correction.
Run: python3 docs/golden-reference/sharp-webapp/validate-and-compare.py
"""
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import json
import re

ROOT = Path(__file__).resolve().parent
AUDIT = ROOT.parent
golden = json.loads((AUDIT / 'golden-cases.json').read_text())
observed = json.loads((ROOT / 'observed-results.json').read_text())
required = ['G1995-feb', 'G1995-jun', 'G2005-jul20', 'G2015-tight',
            'G2015-feb', 'G2025-tight', 'G2025-mar', 'G1985-tight', 'G2005-jul11']
# Official UI uses the alternative Uranus symbol and its own row order.
# Confirmed against rendered SVGs in activation-symbols.json and screenshots.
sharp_order = ['sun', 'earth', 'northNode', 'southNode', 'moon', 'mercury',
               'uranus', 'venus', 'mars', 'neptune', 'saturn', 'jupiter', 'pluto']
td_order = ['sun', 'earth', 'northNode', 'southNode', 'moon', 'mercury',
            'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
checks = 0


def check(condition, message):
    global checks
    assert condition, message
    checks += 1


def differences(left, right):
    return [dict(side=side, planet=planet, left=left[side][planet], right=right[side][planet])
            for side in ['design', 'personality'] for planet in golden['planetOrder']
            if left[side][planet] != right[side][planet]]


def cross_family(text):
    # Compare family/angle only; keep the original variant suffix in the output.
    text = text.split('(')[0].lower()
    text = re.sub(r'\bthe\b', '', text)
    return re.sub(r'[^a-z]', '', text)


check([c['id'] for c in observed['cases']] == required, 'case coverage/order')
check(observed['displayPlanetOrder'] == sharp_order, 'official row ordering')
by_id = {c['id']: c for c in golden['cases']}
baseline = {c['id']: c['baseline'] for c in golden['mismatchCases']}
rows = []
for result in observed['cases']:
    case = by_id[result['id']]
    expected = case['expected']
    for field in ['birthLocal', 'birthUtc', 'location']:
        check(result[field] == case[field], result['id'] + ' ' + field)
    utc = datetime.fromisoformat(case['birthLocal']).replace(tzinfo=ZoneInfo(case['ianaTimezone']))
    check(utc.astimezone(ZoneInfo('UTC')).isoformat().replace('+00:00', 'Z') == case['birthUtc'], 'IANA UTC')
    input_dom = (ROOT / result['evidence']['input']).read_text()
    utc_text = case['birthUtc'].replace('T', ' ').replace('Z', '')
    check(utc_text in input_dom, 'resolved input UTC ' + result['id'])
    check('Europe/London' in input_dom and 'Greater London, England, United Kingdom' in input_dom, 'resolved location')
    check(case['birthLocal'][:10].replace('-', '/') in input_dom, 'input date')
    check(case['birthLocal'][11:16] in input_dom, 'input minute')
    dom = (ROOT / result['evidence']['result']).read_text()
    gate_rows = re.findall(r'- paragraph: (\d+) / (\d+)\s*$', dom, re.M)
    check(len(gate_rows) == 26, '26 rendered activations ' + result['id'])
    for side_index, side in enumerate(['design', 'personality']):
        check(set(result['activations'][side]) == set(td_order), '13 planet IDs')
        for i, planet in enumerate(sharp_order):
            value = '.'.join(gate_rows[side_index * 13 + i])
            check(result['activations'][side][planet] == value, 'DOM row mapping ' + result['id'] + planet)
    check('Profile: ' + result['profile'].replace('/', ' / ') in dom, 'rendered Profile')
    check(result['incarnationCrossDisplay'] in dom, 'rendered Cross')
    check(result['designUtcDisplay'] in dom, 'rendered Design UTC')
    check(result['profile'] == '/'.join(result['activations'][s]['sun'].split('.')[1]
                                      for s in ['personality', 'design']), 'Profile/Sun relation')
    screenshot = (ROOT / result['evidence']['screenshot']).read_bytes()
    check(screenshot.startswith(b'\xff\xd8\xff'), 'JPEG evidence')
    td_file = 'browser-evidence/td8787-' + result['id'] + '.json'
    td_ui = json.loads((AUDIT / td_file).read_text())
    td_activations = {side: dict(zip(td_order, td_ui[side])) for side in ['design', 'personality']}
    for side in td_activations:
        check(len(td_ui[side]) == 13, '8787 UI row count')
    td_profile = re.search(r'人生角色\n(\d/\d)', td_ui['foundation']).group(1)
    td_cross = re.search(r'化身十字\n(.*?)\n闸门', td_ui['foundation'], re.S).group(1)
    if result['id'] in baseline:
        check(td_profile == baseline[result['id']]['profile'], 'TD Profile baseline')
        check(td_activations == baseline[result['id']]['activations'], 'TD 26 baseline')
    td_diff = differences(result['activations'], td_activations)
    jovian_diff = differences(result['activations'], expected['activations'])
    check(not td_diff, 'Sharp WebApp differs from actual 8787 UI ' + result['id'])
    check(td_profile == result['profile'], 'Sharp/8787 Profile')
    is_negative = result['id'] in required[-2:]
    check(jovian_diff == [] if is_negative else
          [(d['side'], d['planet']) for d in jovian_diff] == [('personality', 'sun'), ('personality', 'earth')],
          'registered difference scope')
    check((result['profile'] == expected['profile']) == is_negative, 'Jovian Profile match')
    # Cross display strings have articles, language and variant-number differences.
    # Preserve verbatim values; do not pretend string equality means identity equality.
    cross_changed = result['id'] in ['G2015-tight', 'G2025-tight']
    check((cross_family(result['incarnationCrossDisplay']) !=
           cross_family(expected['incarnationCrossDisplay'])) == cross_changed, 'Cross family/angle comparison')
    if result['id'] in baseline:
        check(cross_family(result['incarnationCrossDisplay']) ==
              cross_family(re.sub(r'([a-z])([A-Z])', r'\1 \2', baseline[result['id']]['incarnationCrossRaw'])),
              'Sharp/TD raw Cross identity')
    else:
        translated_legacy_name = {'G1985-tight': '并列化身十字之幻想', 'G2005-jul11': '并列化身十字之开始'}
        check(td_cross.startswith(translated_legacy_name[result['id']]), 'negative-control TD Cross display')
    check([result['activations'][s][p].split('.')[0] for s in ['personality', 'design'] for p in ['sun', 'earth']] ==
          [expected['activations'][s][p].split('.')[0] for s in ['personality', 'design'] for p in ['sun', 'earth']],
          'Cross four gates')
    rows.append(dict(
        id=result['id'], role='negative-control' if is_negative else 'mismatch',
        birthLocal=case['birthLocal'], birthUtc=case['birthUtc'], location=case['location'],
        ianaTimezone=case['ianaTimezone'], historicalOffsetMinutes=case['historicalOffsetMinutes'],
        classification='all-equal-negative-control' if is_negative else 'A',
        jovian=dict(activations=expected['activations'], profile=expected['profile'],
                    incarnationCrossDisplay=expected['incarnationCrossDisplay'], evidence=case['evidence']),
        sharpWebApp=result,
        td8787=dict(activations=td_activations, profile=td_profile,
                    incarnationCrossDisplay=td_cross,
                    incarnationCrossRaw=baseline.get(result['id'], {}).get('incarnationCrossRaw'),
                    evidence=td_file),
        comparison=dict(sharpVsTdActivationDifferences=td_diff,
                        sharpVsJovianActivationDifferences=jovian_diff,
                        sharpVsTdProfileEqual=True,
                        sharpVsJovianProfileEqual=is_negative,
                        crossIdentityChangedVsJovian=cross_changed,
                        crossInterpretation='Sharp and 8787 same identity; Jovian different angle/name.' if cross_changed
                        else 'Same angle, cross family and four gates; display articles/variant suffixes differ where present.')))

assets = json.loads((ROOT / 'asset-provenance.json').read_text())
versions = {'SharpAstrology.HumanDesign.': '1.2.0+8b78031ce9a4244b8eb0a4ce37e612b8d6782570',
            'SharpAstrology.SwissEph.': '0.5.1+342a57997c1b987e7949acc98897c8b73d05939a',
            'SharpAstrology.Base.': '0.14.0+b029ea0a57fabf84b0d0209aa8d6871b6e64a41c'}
for prefix, version in versions.items():
    check(any(a['name'].startswith(prefix) and version in a.get('assemblyVersionStrings', [])
              for a in assets['assets']), 'deployed package version ' + prefix)
for filename in ['sepl_18.se1', 'semo_18.se1']:
    asset = next(a for a in assets['assets'] if a['name'] == filename)
    check(asset['de441MarkerPresent'] and '2026/04/18' in asset['header'][2], 'official DE441 header')
    check(asset['sameAs8787'] is False, 'different DE441 build hash')

comparison = dict(schemaVersion=1, evidenceScope='9 actual official WebApp UI runs, compared with prior actual Jovian/8787 UI evidence.',
                  productionModified=False, installationModified=False,
                  summary=dict(cases=9, classificationA=7, classificationB=0, classificationC=0,
                               mismatchCasesPartiallyMatchingJovian=0, allEqualNegativeControls=2,
                               sharpVsTdActivationComparisons=234, sharpVsTdActivationDifferences=0,
                               sharpVsJovianActivationDifferences=14,
                               sharpVsJovianProfileDifferences=7, crossIdentityDifferences=2), cases=rows)
(ROOT / 'comparison.json').write_text(json.dumps(comparison, ensure_ascii=False, indent=2) + '\n')
validation = dict(evidenceChecksPassed=checks, evidenceChecksFailed=0, **comparison['summary'],
                  note='Evidence consistency checks passed. Seven baseline Golden failures remain; no engine fix was tested.')
(ROOT / 'validation.json').write_text(json.dumps(validation, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(validation, ensure_ascii=False))
