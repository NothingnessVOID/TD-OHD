#!/usr/bin/env python3
"""Recalculate historical DesignDate minute-label hypotheses; no timezone fit.

Run with python3 -B. Writes only unsealed design-date-analysis.json.
"""
import sys
sys.dont_write_bytecode = True
import json
import hashlib
from pathlib import Path
from datetime import datetime, timedelta

SUITE = Path(__file__).resolve().parents[1]
SOURCE = SUITE / 'existing-design-discriminators.json'
MODELS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']


def analyze():
    raw = json.loads(SOURCE.read_text())
    rows = raw['historicalDesignDateLabelComparisons']
    assert len(rows) == 33 and len({r['birthUtc'] for r in rows}) == 33
    counts = {}
    details = []
    crosschecks = []
    for clock in ['civilUtc', 'modelUt1Numeric']:
        for policy in ['truncated', 'rounded']:
            key = clock + '_' + policy
            counts[key] = {k: 0 for k in MODELS}
            different = 0
            for row in rows:
                assert all(o['timezone'] == 'UNKNOWN' for o in row['observedLabels'])
                labels = {o['parsedWallTime'] for o in row['observedLabels']}
                values = {}
                seconds = {}
                for model in MODELS:
                    prediction = row['predictions'][model]
                    stamp = (prediction['designUtcFromTt'] if clock == 'civilUtc'
                             else prediction['modelUt1NumericClock']['calendarLabel'])
                    date = datetime.fromisoformat(stamp.replace('Z', '+00:00')).replace(tzinfo=None)
                    seconds[model] = date.isoformat(timespec='microseconds')
                    if policy == 'rounded':
                        date += timedelta(seconds=30)
                    values[model] = date.replace(second=0, microsecond=0).isoformat(timespec='minutes')
                    inherited = (prediction['utc' + policy.title() + 'Minute'].rstrip('Z')
                                 if clock == 'civilUtc'
                                 else prediction['modelUt1NumericClock'][policy + 'Minute'])
                    assert values[model] == inherited, (row['birthUtc'], model, key)
                    counts[key][model] += int(values[model] in labels)
                if len(set(values.values())) > 1:
                    different += 1
                    details.append({
                        'birthUtc': row['birthUtc'], 'ids': row['ids'],
                        'observedWallMinuteLabels': sorted(labels), 'timezone': 'UNKNOWN',
                        'clockHypothesis': clock, 'displayPolicyHypothesis': policy,
                        'predictedMinuteLabels': values,
                        'underlyingClockLabelsWithSeconds': seconds,
                        'conditionallyMatchingModels': [k for k in MODELS if values[k] in labels],
                        'interpretation': 'Conditional literal calendar-label equality only; no physical timestamp, timezone, or model winner established',
                    })
            crosschecks.append({'hypothesis': key, 'casesWithDifferentPredictedMinuteLabels': different})
    return {
        'schemaVersion': 1,
        'source': 'docs/jovian-design-discriminator-suite/existing-design-discriminators.json',
        'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'evaluationType': 'retrospective_wall_minute_label_analysis',
        'differentBirthUtcCount': len(rows),
        'observedMinuteLabelCount': sum(len(r['observedLabels']) for r in rows),
        'observedTimezone': 'UNKNOWN',
        'derivation': 'Minute values independently derived from saved full second-level clocks; truncation drops seconds, rounding adds 30 seconds then truncates; all values cross-checked against inherited minute fields. No timezone shifts or fitted offsets applied.',
        'conditionalLiteralMatchCounts': counts,
        'minutePartitionCounts': crosschecks,
        'conditionallyDifferingLabels': details,
        'unconditionalModelDiscriminators': 0,
        'conclusions': [
            'Under modelUT1Numeric truncation all six models produce the same observed minute label for all 33 cases.',
            'Only civilUTC truncation partitions C2 from C1 in one label; this requires an unverified display-clock assumption and is not actual evidence rejecting C2.',
            'Rounded display hypotheses fit only 10–12 of 33 labels.',
            'No label identifies C3 versus C4 versus C5 under any of the four tested hypotheses.',
            'No known-timezone or known-display-policy DesignDate observation establishes a model discriminator.',
        ],
        'limitations': [
            'Saved historical labels are retrospective known evidence, not new blind observations.',
            'Timezone and whether the UI clock represents civil UTC or a model numeric calendar are undisclosed.',
            'Truncation and rounding are explicit hypotheses, not observed display implementation.',
            'Minute labels cannot recover exact DesignTT, longitude, or delta-T.',
            'All new Jovian chart captures lack an observed DesignDate and add no timestamp evidence.',
        ],
    }


if __name__ == '__main__':
    output = SUITE / 'design-date-analysis.json'
    result = analyze()
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result['conditionalLiteralMatchCounts'], ensure_ascii=False, indent=2))
