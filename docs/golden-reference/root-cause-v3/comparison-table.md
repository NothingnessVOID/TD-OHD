# Measured Sun comparison

Proper columns use Swiss UTC→TT/UT1. All Gate/Line values use the unchanged frozen Mandala mapping.

| Case | Jovian | Current naive | Current proper | SE1.64 proper | P+N hybrid proper | Horizons APPROX | Horizons full |
|---|---|---|---|---|---|---|---|
| G1995-feb | 55.4 | 55.4 | 55.4 | 55.3 | 55.3 | 55.3 | 55.3 |
| G1995-jun | 15.3 | 15.3 | 15.3 | 15.2 | 15.2 | 15.2 | 15.2 |
| G2005-jul20 | 56.3 | 56.3 | 56.2 | 56.2 | 56.3 | 56.2 | 56.2 |
| G2015-tight | 41.5 | 41.4 | 41.4 | 41.5 | 41.5 | 41.4 | 41.4 |
| G2015-feb | 13.3 | 13.2 | 13.2 | 13.3 | 13.3 | 13.2 | 13.2 |
| G2025-tight | 60.5 | 60.4 | 60.5 | 60.5 | 60.5 | 60.4 | 60.4 |
| G2025-mar | 36.4 | 36.3 | 36.4 | 36.4 | 36.4 | 36.3 | 36.3 |
| G1985-tight | 41.4 | 41.4 | 41.4 | 41.4 | 41.4 | 41.4 | 41.4 |
| G2005-jul11 | 53.4 | 53.4 | 53.4 | 53.4 | 53.4 | 53.4 | 53.4 |

## Named legacy presets

| Preset | Proper matches /7 | Proper controls /2 | Naive matches /7 | Naive controls /2 |
|---|---:|---:|---:|---:|
| SE1.00 | 4 | 2 | 5 | 1 |
| SE1.64 | 4 | 2 | 5 | 1 |
| SE1.70 | 4 | 2 | 3 | 2 |
| SE1.72 | 4 | 2 | 3 | 2 |
| SE1.77 | 4 | 2 | 3 | 2 |
| SE1.78 | 4 | 2 | 3 | 2 |
| SE1.80 | 4 | 2 | 3 | 2 |
| SE2.00 | 4 | 2 | 3 | 2 |
| SE2.06 | 4 | 2 | 3 | 2 |
| default | 4 | 2 | 3 | 2 |

## Component substitutions toward SE1.64

| Group | Proper matches /7 | Proper controls /2 | Naive matches /7 | Naive controls /2 |
|---|---:|---:|---:|---:|
| component-precession-only | 4 | 2 | 5 | 1 |
| component-nutation-only | 3 | 2 | 2 | 2 |
| component-bias-only | 2 | 2 | 0 | 2 |
| component-deltaT-only | 4 | 2 | 3 | 2 |
| component-precession-nutation | 5 | 2 | 5 | 1 |
| component-precession-bias | 4 | 2 | 5 | 1 |
| component-nutation-bias | 1 | 2 | 0 | 2 |
| component-precession-nutation-bias | 4 | 2 | 5 | 1 |
| component-full-preset | 4 | 2 | 5 | 1 |

## Adjacent preset shifts (proper path)

| Transition | Gate/Line changed cases | Max absolute shift mas |
|---|---|---:|
| SE1.00 → SE1.64 | none | 0.000000000 |
| SE1.64 → SE1.70 | G1995-feb, G1995-jun, G2015-tight, G2015-feb | 64.713848565 |
| SE1.70 → SE1.72 | none | 0.000000000 |
| SE1.72 → SE1.77 | none | 0.000000000 |
| SE1.77 → SE1.78 | none | 0.018452670 |
| SE1.78 → SE1.80 | none | 0.000171485 |
| SE1.80 → SE2.00 | none | 0.000000000 |
| SE2.00 → SE2.06 | none | 0.000000000 |
