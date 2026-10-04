# Seven-case frame and offset diagnostics

Read-only baseline: actual installed8787 browser captures and native dependency/ephemeris values. C SwissEphemeris2.10.03 independently computes flags258 and131330; design instants independently solve preceding88degree solar arc. All tests are diagnostics, with no fitted change adopted.

| Case | Birth UTC | Current Sharp / C131330 P longitude | C258 P longitude | Official P / D Sun | C258 P / D Sun | All26 Gate.Line match |
| --- | --- | ---: | ---: | --- | --- | --- |
| G1995-feb | 1995-02-22T01:08:00Z | 332.9374980286018 | 332.9374999134079 | 55.4 / 34.6 | 55.3 / 34.6 | False |
| G1995-jun | 1995-06-21T23:43:00Z | 90.1249992815627 | 90.1250011663674 | 15.3 / 25.5 | 15.3 / 25.5 | True |
| G2005-jul20 | 2005-07-20T21:40:00Z | 118.2499990018932 | 118.2500008868405 | 56.3 / 3.5 | 56.3 / 3.5 | True |
| G2015-feb | 2015-02-04T06:56:00Z | 315.1249967598370 | 315.1249986448729 | 13.3 / 1.5 | 13.2 / 1.5 | False |
| G2015-tight | 2015-01-26T01:20:00Z | 305.7499968177302 | 305.7499987027751 | 41.5 / 44.1 | 41.4 / 44.1 | False |
| G2025-mar | 2025-03-15T18:56:00Z | 355.4374979965613 | 355.4374998817419 | 36.4 / 11.6 | 36.3 / 11.6 | False |
| G2025-tight | 2025-01-19T22:57:00Z | 300.1249969949901 | 300.1249988801649 | 60.5 / 28.1 | 60.4 / 28.1 | False |

Standard-frame solar results match all26 official Gate.Line activations in G1995-jun and G2005-jul20. The remaining five each differ only in Personality Sun and Earth lines; every Design Gate.Line and other Personality point matches. This all26 comparison does not prove unprinted fine subdivisions, full foundation labels, or Variable equivalence.

## Uniform Mandala offset rejected

All32 captured official records (28unique UTC inputs), both P and D Suns, produce64 offset constraints. Repeated captures are retained as evidence; duplicate constraints do not change intersections.

Current Sharp: must have offset>3.874997499485559deg to preserve G2005-jul11 P53.4, and offset<=3.874996759837018deg to produce G2015-feb P13.3. Intersection is empty, with a7.39649e-7degree gap.

C258: must have offset>3.874999384406024deg to preserve G2005-jul11 P53.4, and offset<=3.874998644872903deg to produce G2015-feb P13.3. Intersection is empty, with a7.39533e-7degree gap.

Every expected Gate.Line spans a half-open normalized longitude sector. Converting the sector to allowable offset gives an exclusive lower bound and inclusive upper bound. Complete per-case inequalities are in `all-official-sun-offset-constraints.json`; explicit seven-case C258/C131330 values and all26 comparisons are in `seven-case-standard-frame-results.json`.

No constant Mandala offset correction can satisfy the presently captured official Sun positive and negative controls under either current Sharp or standard C258 longitudes.
