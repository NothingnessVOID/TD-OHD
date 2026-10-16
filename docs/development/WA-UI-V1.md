# Wa manual organization UI v1

The independent Wa page implements the stage-2 contract with real PeopleStore references, the existing chart provider, core Wa analysis and the core IndexedDB revision repository. It does not seed people, persist charts, infer Alpha, score members, implement automatic Powerbases, or copy the unlicensed reference engine.

## Integration

```js
import { mountWa } from './views/wa.js';
const waView = mountWa(document.getElementById('wa-view'));
waView.render();          // when navigating to the page
waView.refreshLanguage(); // from the host locale callback
waView.dispose();         // before removing the view
```

Mount is synchronous. It returns `{render, refreshLanguage, dispose}`. All async event operations catch their own failures. The view imports its CSS and message registrations, and subscribes/unsubscribes independently to PeopleStore changes. It never reads a global current chart or modifies Team storage/routing. Parent integration owns main.js and index.html.

Optional dependencies are `peopleStore: {list,get,subscribe}`, `computeChart`, `repository: {list,get,history,save,restore}`, and `analyzeWa`. Defaults are the production modules. Repository and analysis result shapes match core exports directly; `communication.pairs` is the only source of theme observations. Only `status: ready` renders results. Comparison uses `diffWa`, including reassignments, group results and `memberChanges` even when six theme coverage is unchanged.

## User flow and state

A new organization starts with an empty pool and three role groups. Choose existing saved people; manually select Alpha or assign/move members through labeled selects. Alpha remains outside the three groups. Group names and organization title are independent editable fields. Standard drafts can be saved before readiness. Observation mode supports incomplete/nonstandard layouts without a formation claim. Unassigned members are excluded from chart calculation and analysis.

Analysis runs on explicit request. Changes immediately clear the current result and retain the preceding ready analysis for comparison. Every async chart result checks a generation and the serialized current person input. Missing references/charts never leave stale coverage visible. Unknown-time people use the existing noon estimate and explicit `birthTimeConfidence: estimated`; result copy says the observation is conditional on the calculated time.

Save uses expected revision, and conflicts retain all local edits. History restore appends a new revision and requires fresh analysis against current people. A separate save generation prevents list/history reads from leaving save controls locked. Navigation invalidates old list/history/get requests. If a person changes during restore, the returned head metadata is retained with the current local draft so a subsequent save can succeed. Save-as-new clears comparison baselines when switching organization identity.

The SVG edges represent manual organization only. Six cards use Wa-specific labels, including 21-45 Management and 25-51 Competitiveness. Details use shared `renderProse` and the public detail-dialog lifecycle, with escaped person names and source IDs. The independent reader preserves all 14 source articles, three locales, sourceRefs and canonical/package aliases. Unknown locales return null/empty, without silent English fallback. No knowledge schema extension is installed.

## Verification

- `node --test tests/wa-content.test.js`: exact localized text/source preservation, aliases/full identifiers, defensive copies and unknown-locale behavior.
- `E2E_URL=http://127.0.0.1:19980 node tests/wa-ui-e2e.mjs`: browser harness imports production modules, stores only explicitly fictional people, and calls real computeChart/WASM, analyzeWa and IndexedDB. It covers standard assignment, pool exclusion, Alpha, member swaps with unchanged aggregate coverage, detail escaping/focus, conditional unknown time, revision save/list/history/restore, remount persistence, conflicts, stale person input, missing references and observation mode.
- Race cases delay production repository/provider calls rather than replace core algorithms. A narrow derived-change probe mutates a non-Wa gate in a real computed chart to prove member changes remain visible when six theme counts are unchanged.
- Matrix: desktop 1440, phones 390/320; en/zh-CN/zh-Hant; light/dark; all visible inputs/selects/buttons at least 44 CSS pixels; no horizontal page overflow. Screenshots are generated at `artifacts/visual-review/wa-ui-v1/` (18 PNGs).
- The same browser test separately opens the application through its real Wa navigation and verifies no automatic member seeding.
- `npm run build`: production build with the existing generated WASM. Existing font runtime-resolution and bundle-size warnings remain.

Manual Powerbase is currently an informational reading entry; no elaborate metadata UI is exposed. Automatic mechanisms, custom policy UI and all-day certainty remain out of scope. No push, main merge or deployment is part of this worktree delivery.
