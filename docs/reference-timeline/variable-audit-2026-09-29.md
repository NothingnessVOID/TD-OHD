# Variable calculation audit (2026-09-29)

## Running implementation

The repository pins `natalengine` **1.6.0** in `package.json` and `package-lock.json`; the installed package reports the same version. `scripts/patch-natalengine-seconds.mjs` runs at `postinstall` and changes the installed transit reader plus the astronomy Date constructor. The latter accepts `{ preserveSeconds: true }` and rounds the complete decimal hour to milliseconds. The patch is reproducible and refuses another package version. The natal adapter now passes that option for both the chart and sensitivity probes.

`HH:MM` is validated and converted by `src/lib/chartdata.js` to `hours + minutes / 60`, because this version of the engine requires a decimal hour. The former default Date constructor passed a fractional minute to `Date.UTC`, which truncates it. A complete 1,440-minute probe on 2000-05-10 found 622 different Sun longitudes from the requested exact minute on that old path, and zero on the preserved path. `tests/variable-pipeline.test.js` locks all 1,440 inputs, including 00:01, 01:01, 07:59, 12:30, 18:47, and 23:59.

The active path is input → pinned astronomy calculation → normalized longitude and wheel offset → Gate (5.625°) → Line (0.9375°) → Color (0.15625°) → Tone (0.026041667°) → Base (0.005208333°) → Variable → card. The engine searches for the Design instant where the Sun was 88° earlier; it does not simply subtract 88 calendar days. Its subdivision and Variable implementation is in `node_modules/natalengine/src/calculators/humandesign.js`; the ephemeris and Node implementation is in `node_modules/natalengine/src/calculators/astronomy.js`.

| Card and position | Actual source in engine | Direction source |
| --- | --- | --- |
| Determination, upper left | Design Sun | Design Sun Tone |
| Motivation, upper right | Personality Sun | Personality Sun Tone |
| Environment, lower left | Design North Node | Design North Node Tone |
| Perspective, lower right | Personality North Node | Personality North Node Tone |

The card order was corrected to the positions above. Its data keys were already correct. The engine's Variable notation remains Design left column followed by Personality right column. Tone 1–3 produces Left; Tone 4–6 produces Right. Color selects the Variable subtype, and changing Color with the same Tone does not flip the arrow. The unit test covers all six Tones with multiple Colors. The three pinned fixture charts in `tests/fixtures/variable-v1.json` record source, longitude, Gate, Line, Color, Tone, Base, direction, Type, Authority, and Profile. They are **engine regression fixtures**, not independent high-precision astronomical truth.

## Independent lunar Node check

`tests/fixtures/true-node-swiss-reference.json` freezes five tropical True Node positions from Swiss Ephemeris 2.10.03 / pyswisseph 2.10.3.2, using `calc_ut(..., TRUE_NODE, FLG_SWIEPH)`. The returned flag was 2 (Swiss ephemeris). The file `semo_18.se1` was downloaded only for development and is not bundled or required in production. `node scripts/verify-true-node-reference.mjs` prints the engine/Swiss comparisons and their Gate through Base subdivisions.

| UTC sample | Engine minus Swiss absolute longitude difference | Visible difference |
| --- | ---: | --- |
| 2000-05-10 04:30 | 0.051144° | Tone 1 vs 3, both Left |
| 2026-07-25 06:00 | 0.014080° | Gate 30.6 vs 55.1; Right vs Left |
| 2026-04-03 12:00 | 0.018442° | Base 1 vs 4 |
| 2026-11-05 00:00 | 0.201635° | Color 2 vs 4; Right vs Left |
| 2026-03-23 18:00 | 0.061145° | Tone 5 vs 2; Right vs Left |

The engine defaults to `nodeType: 'true'` and uses a mean Node plus a five-term correction. The Swiss mean Node values are also frozen and are much farther from the engine values for these samples, so this is not explained by choosing mean versus true Node. The same UTC instants and tropical longitudes were used, and the reference longitudes were passed through the **same** Gate/Line/Color/Tone/Base functions as the engine; this isolates the principal difference to Node longitude, rather than timezone, UI mapping, or the subdivision code. The evidence points to the engine's approximate True Node calculation. We have not replaced the production Node algorithm because no validated, compatible, redistributable high-precision implementation has been integrated. Near subdivision boundaries, current Node-derived values and arrows can differ from Swiss Ephemeris; this is an open accuracy limitation.

References: [Jovian Variable overview](https://jovianarchive.com/blogs/deeper-mechanics-system-theory/variable-the-blueprint-of-brain-body-and-mind), [Jovian Nodes](https://jovianarchive.com/blogs/deeper-mechanics-system-theory/the-nodes-of-the-moon), [Swiss Ephemeris documentation](https://www.astro.com/swisseph/swisseph.pdf), [Swiss Ephemeris source](https://github.com/aloistr/swisseph).
