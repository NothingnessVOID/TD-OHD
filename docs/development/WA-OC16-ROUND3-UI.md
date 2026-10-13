# Wa / OC16 round 3 — page layout and readability

Baseline: `df45d2e` on `feature/penta-wa-integration-v1`. Presentation-only: no change to OC16 catalog, coverage calculation, Sharp/Penta, persistence, schema, detail renderer or the accepted six-core-channel SVG geometry.

## Problems addressed

- Scope lived inside the graph panel as a dropdown, although it drives the whole page.
- Overview, pillars and departments were three separate panels with repeated numbers; nothing pointed at what is missing.
- Department cards used two large progress bars each; at high coverage all six looked identical, and gaps were only visible after expanding.
- Members were dot-joined text; group size validity (3–5) was not visible.
- Header carried four equal-weight buttons, including a duplicate "Edit members".

## Changes

- Page-level segmented scope control (`[data-scope-option]`, `aria-pressed`) under the configuration; the include-Alpha checkbox and `[data-scope-label]` sit beside it. Hidden while no member is assigned.
- Header keeps New / Open / Save with the draft status pill (`.wa-draft-status[data-dirty]`). "Edit members" moved into the configuration panel.
- Configuration cards show member chips and a group size badge (`ok` 3–5, `warn` otherwise, `empty`).
- One overview panel: three stat tiles with meters, four pillars, and a new "Structural gaps" list of uncovered gates grouped by department. Gap chips open the existing gate detail.
- Department cards: one-line score (gates / pairs), thin meter, and a strip of pair tokens. Each token shows both endpoint gates filled/empty and opens the existing pair detail; the core pair is outlined. The expandable contributor rows are unchanged.

All colors use existing Skin tokens (`--accent`, `--accent-soft`, `--status-success/caution(-soft)`, `--border-subtle`, `--bg-*`, `--text-*`). New text is registered in `oc16-messages.js` for zh-CN / zh-Hant / en; gate names come from `vocabulary.js`.

## Verification (targeted, pre-acceptance)

- `vite build --mode static` and the Pages bundle check pass (existing chunk-size warning only).
- `wa-oc16-preview-e2e.mjs` and `wa-oc16-details-e2e.mjs` pass on 9961 with real WASM and fictional people. Their scope steps now click the segmented control instead of selecting from the removed `<select>`; no assertion was weakened.
- Wa unit tests: 87 pass; the same 4 source-audit byte-pin tests fail before and after this change (pending audit approval).
- Visual review: desktop 1440, phone 390, zh-CN / zh-Hant / en, default light, default dark, high contrast, coral; empty, full organization and single-group scopes.

Full regression and audit re-pinning remain deferred until user acceptance.
