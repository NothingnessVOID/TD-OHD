# C shared details handoff

Scope: feature/p0-shared-details, baseline 1d41435. Only this worktree was edited. No A/B source, engine, Knowledge content, evidence level, historical audit manifest, global CSS/i18n, or package/config files changed.

## Shared API

`src/lib/shared-object-details.js` exports `pentaDetailAdapter` with `gate(record, ctx)`, `channel(record, ctx)`, `knowledge(objectId, ctx)` and `bind(root, ctx)`. Renderers return HTML. `bind` returns an idempotent disposer and replaces a previous shared binding on the same root. No current chart/person/storage lookup occurs in this module.

`renderSharedGateReading`, `renderSharedChannelReading` and `bindSharedObjectDetails` are now used by chart.js and reference.js. Ordinary activation rows, graph navigation, chart exports, and detail-dialog API remain intact. Existing data-lens/data-reference-lens selectors remain aliases for the shared controls.

Lens semantics remain hd = existing HD detail and HD lines; iching = existing I Ching hexagram and six lines; gk = existing Shadow/Gift/Siddhi reading; meridian = supplied meridian/acupoint data. Labels are now the requested detail information / six-line reading / gene gifts / meridian terminology. No Knowledge prose was moved or rewritten.

Penta gate order: header/base information, explicit member activation rows, verified specific content if present, shared four-lens reading, related channels. All twelve per-gate specific sections are currently omitted because both Knowledge text slots are null. Six channels show their verified structural summary, without treating it as a function or role. Four coverage states remain coverage states. Knowledge inventories remain 70 / 91 / 21.

Member unknown-time labels use `timeUnknown` and display an estimated 12:00 marker. All user-supplied identity/group strings are escaped. Penta uses activation records and people passed by its caller, never the current chart.

## B / parent wiring (not applied to B-owned files)

```js
import { pentaDetailAdapter } from '../lib/shared-object-details.js';
createPentaMatrix(container, { result, people, groupLabel, detailAdapter: pentaDetailAdapter });
```

Inside B's optional-adapter host, render with `detailAdapter.gate(gateRecord, ctx)` / `channel` / `knowledge`. After replacing the dialog body:

```js
disposeDetails?.();
disposeDetails = detailAdapter.bind(dialog, {
  result, people, groupLabel,
  onGateSelect: gate => showGate(result.gates.find(item => item.gate === gate)),
  onChannelSelect: id => showChannel(result.channels.find(item => item.channelId === id))
});
```

The host owns history/back navigation, prepareDetailDialog/openDetailDialog/closeDetailDialog and its existing focus restoration. Shared bind owns four-lens and related-link events only; it does not add a second Escape handler or reset the host's trigger. Dispose before replacing detail content and on dialog/controller teardown. Optional `onBack` handles a host-provided `[data-shared-back]` button; B may instead retain its own Back handler. Do not render the old knowledgeSections alongside adapter output, which would duplicate source/missing UI. Supply the same people snapshot including timeUnknown/estimatedTime. Call renderer again on locale changes.

## Validation

- npm.cmd ci --no-audit --no-fund: passed (162 packages; npm reported pending install-script approvals, no config changed).
- Focused shared/Penta/i18n/localization/traditional tests: 27 passed.
- tests/shared-object-details-e2e.mjs: passed in isolated Chromium with fictional chart and Penta identities, real chart gate click, chart/library body equality, three locales, member isolation, absent specific sections, no URL/audit text, lens events, gate/channel callbacks, Back, Escape, trigger focus and disposer.
- tests/reference-e2e.mjs: passed desktop/mobile.
- tests/gate-meridian-e2e.mjs: passed library/chart/transits/timeline, widths 1380/390/320 and dark mode. Only outdated label assertions were updated to this task's requested wording and English meridian label; layout/data assertions unchanged.
- npm.cmd run build:pages: passed; existing >500kB chunk warning.
- git diff --check: passed.
- Full npm test before static build: 448 tests, 430 passed, 15 failed, 3 skipped. Full suite was not rerun after build; targeted licensing rerun resolved both missing dist notice failures (7 passed/1 historical audit failure including shared tests).

Remaining full-suite findings (not silently waived):

1. Ten historical source/hash boundary failures: connection-scope-boundary, knowledge-polish, knowledge-round2b, knowledge-round2e/f/g, penta-phase1c-scope, release-licensing synced-source audit, skin-reviewed-scope, variable-29-content. They require chart.js/gate-lenses.js to match previously reviewed bytes. This task explicitly authorizes their refactor; historical manifests were not changed. Parent must review new C revision as a separate authorized change.
2. local-server: Windows file mode 438 vs expected 384.
3. no-natalengine: existing tests\\team-members-phase1b.test.js path appears in prohibited-reference scan (Windows path form); no engine source changed.
4. swiss-parity-fix: G2015-feb/design/venus speed delta 1.1533139332442488e-8; engine unchanged, no attempt to relax tolerances.
5. The two missing dist notices from initial full run passed after build:pages.

No real user profiles were used. Browser service used only 127.0.0.1:19963 and CHROME_CHANNEL=chromium. The new browser test initially used direct chart-module import and timed out after Vite HMR created a separate module instance; it now clicks the real gate UI and passes. No main-session browser used.

## Current-person invalidation hook

`chart.js` additionally exports `clearCurrentChart()`. Parent/A should import and call it when the current person is deleted or invalidated, before leaving/refreshing the current-person view. It closes only the bodygraph-owned detail sheet, releases shared detail listeners, clears history/context/current lens and graph references, and makes `getCurrentChart()` return null. Repeated calls are safe. It does not touch profile storage or A's main.js. The isolated browser test checks a non-null fictional chart and an open detail before cleanup, then verifies null, closed detail and no reopening through showGateDetail after two cleanup calls.

```js
import { clearCurrentChart } from './views/chart.js';
clearCurrentChart();
```

## Integration limits

B's real Penta matrix has not been connected in C's branch because B owns that file. Adapter/dialog integration was exercised in an isolated host using the real detail-dialog API; the parent should run the merged matrix flow after wiring. No new CSS was necessary; existing detail/reference/lens primitives are reused. No push, merge, PR or deployment performed.
