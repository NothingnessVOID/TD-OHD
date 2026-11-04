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
- `timeline.css` last section: Single is an orange base plus a generated oil-film foil texture; Split yellow, Triple violet, Quadruple blue. Light/dark adapt via `data-theme`; edges mix with skin tokens; static, no animation. forced-colors falls back to system colours.
- Locales: en `messages.js`, `zh-CN/timeline.json`, `zh-Hant/timeline.json`. Bar labels are the bare count (`1`-`4`); the full name stays in the tooltip and accessible label.

## Single (1) foil texture
- Asset: `src/features/transit-timeline/assets/definition-foil.png` (900x60 RGBA, 73 KB, ratio 15:1 matching the 400x27 tile).
- Generated with GPT Image 2.5, then converted by `scripts/foil-to-alpha.py`: `gamma 1.1, sat 1.4, cap 235, alpha_scale 1.0`. To regenerate, re-run the script on a 2172x724 black-backed render after cropping a 2172x145 band.
- Composited with plain alpha (`background-blend-mode: normal`), NOT an additive blend. `screen`/`lighten` over the already bright orange base pushes every hue toward white, which is what made the earlier CSS-only attempts read as milky. Alpha compositing keeps cyan, violet and magenta at their generated saturation and leaves the black gaps as pure orange.
- The 15:1 band is cropped, never squashed: the source render is 3:1, and compressing it to the tile ratio was what turned film patches into horizontal filaments.
- The count digit on the Single bar sits on a dark chip (`rgba(28,12,2,.85)` + `#FFE9C9`, 11px/600, radius 3px, padding 1px 4px, line-height 14px) because its foil has irregular light and dark patches, so no bare ink colour is legible everywhere. Split/Triple/Quadruple have uniform gradient bases with contrast-checked ink and stay chip-free.
- Selection was made over four review rounds against rendered 27px samples; the intermediates were deleted, only the final asset is committed.

## Fixed during visual verification
- Dark-theme Single ticks painted the Split yellow hairline: the `:root[data-theme="dark"]` tick rule (specificity 0,5,0) outranked the `[data-definition="1"]` override (0,4,0). Both the reset and the Single override now list the dark variant. Verified by computed style in both themes.
- `aria-label` repeated the definition name (`一分人 · 一分人 · …`) because the markup helper prepended a `name` argument to a `title` that already contained it. The helper now uses the caller's title verbatim for both attributes; a regression assertion pins this.

## Known observation, not a regression
- In dark skins the ordinary transit-coloured channel bars (`--tl-transit`, `#3F7C82`) sit close to the surface. That is pre-existing transit colour semantics, which this branch must not change; flagged for a separate decision.

## Verified
- `tests/timeline-definition-state.test.js` 10/10 (2→1/3, 3→2/4, same count different topology, hanging gate, 0 islands, planet filter, AND/OR with all four kinds, query vs track consistency, annual replay, versioned cache, short-bar geometry).
- `npm run test:timeline` 63/63; bridge/split/annual/chart-contract suites 44/44; `npm run test:localization` 34/34.
- `npm test`: 644 pass / 4 fail. The 4 failures are in `local-private-path`/`local-server` (`Unsafe private path: /var`, a macOS temp-directory environment issue) and reproduce on the untouched baseline.
- e2e (5237): timeline-e2e, timeline-gestures-e2e, issues-38-39-e2e, premerge-corrections-e2e pass. review-round2-e2e fails at its 327px header assertion before reaching the timeline; the baseline fails identically. Its timeline assertions were checked with a separate script: first row `definition:state`, digit labels, query targets and is/is-not states, no page errors, no 404s.
- `vite build --mode static` succeeds; the foil asset is emitted and hashed (`dist/assets/definition-foil-*.png`, 74.98 kB).
- Visual acceptance over four review rounds on rendered 27px samples plus real-page context shots, light and dark. Final verdict: deliverable; no further texture, gamma or chip changes requested.

## Not verified
- Phone touch on short bars and keyboard focus order on the real page.
- A per-skin review across all ten skins; only default-light/default-dark were reviewed. High-contrast in particular has had no human review.
- Real performance and bar density over a full year-scale range.
- The foil texture is a fixed 400px tile, so its repeat is recognisable on very long bars. No hard seam was observed.
- Full browser regression not run (AGENTS: run only after the user accepts).
