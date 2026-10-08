# BodyGraph source contrast repair

Base: a13eab9c1f9e82f9c3b2fcbc6b9692018f7037ef. Branch: fix/bodygraph-source-contrast.

Presentation only. No Skin or Center Palette CSS values, astronomical engine, relationship topology, arrow direction/size, source stripes, graph paths or layout changed. Historical Skin and relationship scope manifests remain intact; source-contrast-scope.json pins the six newly authorized source files and historical guards validate their exact hashes before projecting to the base snapshot.

## Changes

- src/bodygraph.js:321 restores composite → Transit → unified natal → P/D/Both foreground-token semantics.
- src/bodygraph.js:363 uses inactiveOn for composite inactive gates; ordinary defined-center lightened circles retain their existing fill and preferred #111111.
- src/bodygraph.js:536 checks actual solid fills and alpha-composited inactive surfaces. Tokens meeting 4.5:1 remain unchanged; otherwise select a readable foreground. Stripes test both fills; incompatible or strongly contrasting stripes get a local ellipse behind the number, with a visible source perimeter. No fixed white foreground or 1.15 black outline.
- src/lib/source-contrast.js uses WCAG sRGB luminance; source small text mixes toward page text until passing 4.5:1. Page and tooltip foregrounds are separate. Browser CSS color resolution supports color-mix; transparent graph surfaces are omitted in favor of underlying page surfaces.
- src/lib/appearance.js:64 refreshes derived text whenever appearance/custom overrides change, before notifying graph consumers.
- src/styles.css separates source foregrounds for columns, tooltip, details and transit consumers. src/styles/variable-arrows.css:17 adjusts labels only; arrow symbols retain source fill. src/features/transit-timeline/timeline.css:112 separates natal/transit text and fixing marks from fills.
- Updated transit-source-strategy, appearance-skin and skin-presets E2E: source fill assertions stay exact; foreground assertions use contrast/derived text tokens. New source-contrast tests cover cross-product and screenshots.

## Final verification

- Build PASS.
- Full Node suite: 391 total, 388 PASS, 3 SKIP, 0 FAIL.
- source-contrast-e2e PASS: 3960 cases = 11 Skins × 9 Center Palettes × default/light/dark/opposite custom source settings × birth/overlay/transit-only/composite/compact × desktop/mobile.
- transit-source-strategy-e2e PASS; exact fills, source strategy, Integration geometry and calculation model invariants retained.
- appearance-skin-e2e PASS: real birth page source columns, tooltip, details, live overrides, transit and timeline.
- skin-presets-e2e PASS: all 11 Skins, eight surfaces, relationship painting, controls, three languages and mobile.
- connection-structure-e2e PASS: 11 Skins × three languages, 9 Center Palettes, states/Created/bridging.
- git diff --check PASS.

Minimum measured numeral contrast across matrix:

| Mode | Minimum |
| --- | ---: |
| Birth | 4.5160:1 |
| Overlay | 4.5010:1 |
| Transit only | 4.5192:1 |
| Relationship | 4.5240:1 |
| Compact/reused renderer | 4.5160:1 |

Derived source small-text minimum against page/elevated/tooltip: 4.5037:1. Numeral source coverage includes Personality, Design, Both, Transit, A, B, Inactive. Created centers are exercised by relationship fixture and existing structure regression; Created is a center/channel state, not a separate gate owner.

Screenshots: /Users/abyssldx/Desktop/OH-WorkSpace/TD-OHD-contrast-evidence. Desktop/mobile mixed black/white stripes in default-light, default-dark and Absolutely reviewed manually for numeral separation and visible source perimeter; presets/ holds full real-page evidence for all Skins including relationship, transit and timeline. Programmatic contrast supplements visual inspection of stripes.

Intermediate runs were interrupted by Vite HMR navigation and a one-year timeline wait timeout while source edits were active. All final listed runs passed after edits stopped; no navigation assertions/timeouts were weakened.

No merge, production deployment, branch deletion or Phase 2 implementation.
