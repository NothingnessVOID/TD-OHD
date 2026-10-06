# Knowledge / Reference release gate

## Approved product baseline

- RC: `7b133bdcbe600bb6f0e0fa8925da890ea39c9978`
- Target main: `bc9b217fab260b1017bfb1478141f864e402289e`
- The RC incorporates 29 approved commits after main. This gate adds no Knowledge prose or calculation changes.

## Verification boundary

Earlier Round 2 tests compared current files against milestones that predated the subsequently approved restoration, navigation, primitives, circuit hierarchy and category collapse. Those expectations cannot describe the final product.

`tests/helpers/knowledge-release-contract.js` pins the user-approved RC for the specific presentation files changed after Round 2G. Calculation, geometry, export and other unchanged sources retain their historical comparisons. The Round 2B/C/F/G fixtures remain immutable; their historical range proofs still execute. Current three-language content is compared character for character against the RC, rather than rewriting historical fixtures.

`release-candidate-scope.json` adds the later approved presentation hashes to the existing two-parent release guard. Every scope hash is verified against its fixed Git blob. The calculation signature and annual ephemeris checks remain unchanged.

## Release fixes

1. Add the JSON import attribute required by native Node to Reference supplements; browser content and rendering are unchanged.
2. Set `VITE_OHD_LOCAL=false` explicitly for production/static builds, and disable sync in static mode. Without an explicit literal, Vite retained the optional environment lookup and the local installation client in the bundle. The static bundle exclusion check now passes. The installed local service at 8787 is untouched.
3. Appearance CI fetches the history needed by immutable provenance tests and builds `dist` before tests that inspect distribution notices. The previous CI failed because the distribution was absent.
4. Browser tests open the now-collapsed category control before selecting a filter, use final categories/titles, and retain modal, focus, navigation and layout assertions. Variable's library action is exercised via keyboard to avoid the test runner waiting on an already-detached navigation button.

5. Linux CI exposed ARM/x64 floating-point fixture differences (one reported longitude delta ~8e-14 degrees). Native chart comparison permits only longitude differences below 1e-10 degrees and retains exact timestamps, subdivisions, identities, channels, centers and components. Swiss fixture speed uses the existing independent-C 1e-8 degrees/day bound; unchanged node vectors use 1e-14 AU for position and 1e-12 AU/day for finite-difference velocity (Linux observed 8.46e-14 AU/day). Golden fixtures and all calculation source remain unchanged. These are continuous-number portability assertions, not a calculation or fixture rewrite.

## Local validation

- `npm ci`: passed.
- `npm test`: 359 tests, 356 passed, 0 failed, 3 skipped. The skips are existing opt-in online geocoding tests.
- `test:localization`, `test:timeline`, `test:sharp`: passed.
- `build`, `build:pages`, `check:pages-bundle`: passed. Vite retains the existing large-chunk advisory.
- `verify:annual`: all 16 years (2021–2036), zero activation and graph differences.
- Appearance, Timeline (including gestures/touch/mobile layout), Planet, Reference, Knowledge Access, BodyGraph regression, Sharp and Chart Data Export browser suites: passed.
- Existing Knowledge Layer, Presentation, Visual, Refinement, Polish, Deviation and Variable 29 browser suites: passed.
- Knowledge Access: 12 exact Foundation comparisons, 15 same-body locale combinations, six reload routes.
- BodyGraph: 24 exact RC DOM/text/geometry comparisons, including timing and controller transitions.
- Visual: 96 cases; Refinement: 252 scenes; Polish: 132 checks; Deviation: 72 cases; Variable: 348 cases plus 12 Detail isolation comparisons.
- Additional `release-library-e2e.mjs`: desktop/mobile and three languages; 13 category order, automatic collapse, three basic concepts, three parent groups, seven independent circuits, dynamic channel counts, two badges and overview navigation. Passed against both development and the static production bundle.

Layout comparisons use an independent immutable RC checkout on a separate port, not the candidate compared with itself. They check that release fixes do not change the approved final product. Historical prose/geometry guarantees are additionally covered by unit tests.

## Manual smoke

The candidate library opens with categories collapsed. Selecting Basic collapses the control and shows exactly Design, Personality and Transit. Circuit groups list three parents and seven children. Individual opens its three children; Integration opens its independent page with the four topology-derived channel links. Screens and navigation were inspected in the browser; broader languages/mobile and modal paths are covered above.

Merge and deployment identities are reported after GitHub Actions and production smoke pass. No additional content stage is started.
