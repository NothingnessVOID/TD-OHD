# HANDOFF · feature/timeline-definition-glow

- Branch `feature/timeline-definition-glow`, baseline origin/main `faadd681`, feature commit `c09c119b` (followed by the commit that adds this handoff file).
- Isolated preview (loopback only): `http://127.0.0.1:5237/`. Synthetic demo: `http://127.0.0.1:5237/dev/definition-glow-demo.html`. Log: `/tmp/vite-5237-definition-glow.log`. 9961 not touched.
- Not done: PR, merge to main, deploy.

## What changed
- `bridge.js` `definitionState()`: recomputes the connected components of every complete channel from natal + effective transits from scratch (not from bridge counts), so 2→3 detached islands, 3→4, merges, and "merge + new island = same count" are all correct. Hanging gates don't form islands; 0 islands produce no interval.
- `graph-provider.js`: new `definition:state` row with source `"1"`–`"4"`. It goes through the same `stateAt` (and so the planet filter) as the other rows; annual replay and direct calculation both derive it. The annual file format is unchanged. `bridge:natal` is still computed (contract unchanged); it's just no longer displayed.
- `client.js`: the derived-result cache key includes `DEFINITION_STATE_VERSION`, so old results are never reused. `conditions.js` rejects old results that lack the row (asks the user to recalculate).
- `conditions.js`: `kind:'definition'`, ids `['1'..'4']`, state active=is / inactive=is not. Uses the same intervals as the track; a count equal to natal is still queryable.
- `view.js` + `definition-bars.js`: the first row is now "Definition state". Intervals with the natal count are not drawn. Labels show only the final count ("Single Definition", etc.). Clicking lights the centers of components that differ from natal (merged or new). Below 6px a bar keeps its true width, gains a 14px invisible hit area plus a diamond top marker, and its exact time and duration go into title/aria-label.
- `timeline.css` last section: Single is an orange base + irregular pink/violet/cyan spectral bands (three band layers repeating at unrelated periods), Split yellow, Triple violet, Quadruple blue. Light/dark adapt via `data-theme`; edges mix with skin tokens; static, no animation. forced-colors falls back to system colours.
- Locales: en `messages.js`, `zh-CN/timeline.json`, `zh-Hant/timeline.json`.

## Verified
- `tests/timeline-definition-state.test.js` 10/10 (2→1/3, 3→2/4, same count different topology, hanging gate, 0 islands, planet filter, AND/OR with all four kinds, query vs track consistency, annual replay, versioned cache, short-bar geometry).
- `npm run test:timeline`, bridge/split/annual/chart-contract-related tests, `npm run test:localization` all pass (after `build:engine`).
- `npm test`: 644 pass / 4 fail. The 4 failures are in `local-private-path`/`local-server` (`Unsafe private path: /var`, a macOS temp-directory environment issue), unrelated to the timeline.
- e2e (5237): timeline-e2e, timeline-gestures-e2e, issues-38-39-e2e, premerge-corrections-e2e pass. review-round2-e2e fails at its 327px header assertion before reaching the timeline; the baseline fails the same way. A separate script checked the timeline part: first row `definition:state`, labels like "Triple Split", query options and is/is-not, no page errors.
- `vite build --mode static` succeeds.

## Not verified
- Phone touch on short bars, keyboard focus order on the real page, and screenshots of the 10 skins one by one (the demo can switch skins, but the high-contrast look hasn't been reviewed by a human).
- Real performance and bar density on a long year-scale range.
- Full browser regression not run (AGENTS: run only after the user accepts).
