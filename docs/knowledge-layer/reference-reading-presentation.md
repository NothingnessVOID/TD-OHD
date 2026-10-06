# Planet / Channel / Center reading presentation

Baseline: `368a2323238fe0e2971f291f34b485f559449515` on `fix/variable-copy-localization-v1`.

- Planet Reference and Chart use `renderPlanetReading()` for the unchanged Summary lead and spaced Detail paragraphs/lists. Chart owns a separate Current activation section with the existing Gate link and Color/Tone/Base values.
- `channelReading()` keeps original description / whenDefined and adds a small section label, compact archetype (Chinese and English separated where present), mechanism prose, and subtle paired state panels. The pair stacks below 600px. Both surfaces use the shared function.
- `centerReading()` now returns only theme and state meanings, including Open supplement within Open. `centerInsights()` renders Not-Self and Potential wisdom outside the state frame on both surfaces. Insights use light separators and desktop columns / mobile stacking.
- User-visible Human Design Not-Self wording in zh-CN / zh-Hant is standardized to 非我. Ordinary wording in Gate Lines / I Ching (而非自己、并非自己选择) is deliberately preserved.
- No prose meaning, topology, engine, BodyGraph, Gate/Circuit pages, Header, Timeline, overall library layout or modal sizing changes. Previous shared button primitives remain intact.

## Minimal manual confirmation

At localhost 5211, inspected zh-CN desktop Reference Sun, Channel 10-34, Centers Root/Head; Chart Personality Sun, Spleen Open, Channel 23-43. Confirmed lead/body/activation separation, two-column state comparison, Open supplement inside state frame and insights outside it.

English mobile (390px): inspected Reference Channel 23-43, Head and Pluto; Chart Design Pluto, Spleen Open and Channel 23-43. Confirmed activation values remain, state/insight grids are single-column, inspected containers have no horizontal overflow. Restored zh-CN/default viewport afterwards.

Existing planet and supplement data are preserved; the supplement JSON diff is limited to the two localized Not-Self labels. Knowledge prose changes are only the specified terminology. Full unit / E2E / responsive suites / build were not run. No merge or deployment. Further visual refinement remains subject to user review, with no known structural issue found in these samples.
