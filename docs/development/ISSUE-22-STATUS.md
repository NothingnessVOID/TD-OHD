# Issue 22: associated channel status

Base: `94ae062dc1d1d19ca7f8cbfa7cee2f31546ae963`.
Source commit: `3e4e2c9f484f74ae0ddaa04edfddb48e5574c559`.

The gate detail's associated-channel status now reuses the full channel detail's `tl-activation-label` and `tl-detail-channel-status`. Defined/natal channels also use `tl-activation-natal` and translated `Birth activations`. The original source class remains intact, including inactive, completed and transit. This applies only when `channel.gates.includes(sourceGate)`; center callers retain their original badge and text.

The source delta is five added lines and one replaced line in `renderChannelJump`. Existing CSS is reused without modification. The base already contains the required natal/defined normalization in `bodygraph-detail-layout.js`, so that module is unchanged. Channel/source calculations, paired entry markup and events, full channel titles/cards, and timing remain unchanged.

## Validation

Isolated Vite: `127.0.0.1:19970`, Node 24.19.0, headless Microsoft Edge. Existing `node_modules` and `public/engine` reused through directory junctions; no install or engine build. Parent service on 9961 was not modified.

- `tests/issue22-channel-status-e2e.mjs`: three languages (en, zh-CN, zh-Hant), 1280/320, default-light/default-dark. Real birth, transit and timeline BodyGraph clicks exercise gates 20/57; birth gate 24 verifies full natal channel 24-61. Production `buildTransitGraph` fixtures verify natal/completed/transit/inactive. Every associated status is compared with its full detail for exact localized text, classes, computed font family/size/weight/line-height, color, background, margins, padding, radius, letter spacing and text transform. Also checks center badges, paired hit targets/touch/keyboard/back and retained full cards. PASS: 372 exact list/full comparisons.
- `tests/issue22-23-details-e2e.mjs`: PASS, 43 cases. Existing assertions unchanged; an in-memory runner suppressed only screenshot writes to avoid a large evidence batch.
- `tests/transit-window-reuse-e2e.mjs`: the two natal-label selectors now explicitly address `.tl-detail-statuses`, because associated channel statuses intentionally share the natal class. Expected values and all other assertions remain unchanged. PASS: desktop and mobile.
- Targeted source scope check: PASS. All bytes outside `renderChannelJump` match the base; only `src/views/chart.js` changed under `src/`.
- Syntax check and `git diff --check`: PASS.

Test development exposed two incorrect harness assumptions: inactive timeline channels may have no timing interval, and the current timeline table may omit gate 57. The final test validates timing identity when present and uses the timeline's actual BodyGraph gate click. Failure artifacts are retained locally. The mobile skin picker also exits timeline reading mode through its visible UI before opening settings. Source was not changed during these test corrections.

Evidence is local under `artifacts/issue22-status/` (JSON metrics and two 320px Chinese light/dark screenshots), plus `artifacts/issue22-23/results.json`. Historical snapshot/audit tests are intentionally not repinned here; the parent owns the new source scope projection.
