#!/usr/bin/env python3
"""Read local TZif evidence; no downloads or application/engine changes."""
import json
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, available_timezones
from zoneinfo._common import load_data
from zoneinfo._tzpath import find_tzfile

lo = datetime(1800, 1, 1, tzinfo=timezone.utc).timestamp()
hi = datetime(2201, 1, 1, tzinfo=timezone.utc).timestamp()
# Even a 367-date span plus the largest global offset spread fits this search
# horizon. Evaluate reception/emission sides of every explicit TZif transition.
horizon = 370 * 86400
best = 0
witness = None
count = 0
for name in sorted(available_timezones()):
    file = find_tzfile(name)
    if not file:
        continue
    with open(file, 'rb') as stream:
        indices, transitions, offsets, is_dst, _, _ = load_data(stream)
    count += 1
    previous = offsets[next((i for i, flag in enumerate(is_dst) if not flag), 0)]
    states = []
    for instant, index in zip(transitions, indices):
        offset = offsets[index]
        if lo <= instant < hi:
            states.extend([(instant - 1, previous), (instant, offset)])
        previous = offset
    maximum_offsets = deque()
    for instant, offset in states:
        while maximum_offsets and maximum_offsets[0][0] < instant - horizon:
            maximum_offsets.popleft()
        if maximum_offsets and maximum_offsets[0][1] - offset > best:
            best = maximum_offsets[0][1] - offset
            witness = {'zone': name, 'before': maximum_offsets[0], 'after': (instant, offset)}
        while maximum_offsets and maximum_offsets[-1][1] <= offset:
            maximum_offsets.pop()
        maximum_offsets.append((instant, offset))

zone = ZoneInfo('Pacific/Apia')
start = datetime(1891, 8, 1, tzinfo=zone)
end = datetime(1892, 8, 2, tzinfo=zone)
elapsed = end.timestamp() - start.timestamp()
assert best == 86400
assert elapsed == 368 * 86400
version_file = Path('/usr/share/zoneinfo/tzdata.zi')
print(json.dumps({
    'tzif_version': version_file.read_text().splitlines()[0] if version_file.exists() else 'not recorded',
    'zones': count, 'explicit_transition_period': '1800-01-01 through 2201-01-01 exclusive',
    'search_horizon_days': 370, 'largest_backward_offset_change_seconds': best,
    'offset_change_witness': witness,
    'range_witness': {'zone': zone.key, 'start_local': start.isoformat(), 'end_local_exclusive': end.isoformat(),
        'start_utc': start.astimezone(timezone.utc).isoformat(), 'end_utc_exclusive': end.astimezone(timezone.utc).isoformat(),
        'elapsed_days': elapsed / 86400},
    'scope': 'Installed TZif explicit transitions; future POSIX recurrences are not enumerated. JS/ICU range witness and finite cap are independently asserted by timeline-presets.test.js.'
}, indent=2))
