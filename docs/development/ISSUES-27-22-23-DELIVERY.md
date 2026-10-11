# Issues 27 / 22 / 23 — development preview delivery

Base: `f436587116ab605eb1d9ff1b50c333bd7c23cdcc`.
Target: `dev/windows-development`, Windows preview `http://127.0.0.1:9961/` / `http://192.168.10.99:9961/`.
This iteration does not authorize main merge, GitHub Pages test-site deployment, Netlify production deployment, or closing the three Issues. All three remain open for user acceptance.

## Changes

- A / Issue 27: `4b6819cd1a39ad184388b41a7d1d418fe641ba8d`. Penta click selection belongs to the open detail lifecycle. Close, Escape, backdrop and disposal clear it and its pressed semantics. Pointer hover, four coverage states, member focus and keyboard focus remain independent. Team language refresh preserves the matrix/history and restores the equivalent trigger after DOM refresh.
- B / Issues 22–23: `b11cb649040c7b2e016758b1c0a0e34f71ecaa29`. Gate details offer every channel's other gate, including inactive channels, via existing history. Uses existing `Harmonic gate:` translations (Chinese: 谐波闸门 / 諧波閘門), gate number and `gateName()`. Center detail is unchanged. Birth/transit channel gate cards use shared label/name/action hierarchy and one column at <=480px; badges retained. Transit locale refresh preserves the selected activation source.
- Audit: `7a55f81` adds an exact five-file snapshot layer before older source guards, with mutation/old-bug/unauthorized-path negatives. Old manifests and hashes remain unchanged.

Actual product diff is limited to `src/views/penta-matrix.js`, `src/styles/penta-matrix.css`, `src/views/team.js`, `src/views/chart.js`, and `src/styles.css`. Engine, Knowledge content and person storage are unchanged. Shared component registration is updated in UI_COMPONENT_INVENTORY.md.

## Validation

- Penta final targeted matrix: 27 combinations of 1280/320/390, en/zh-CN/zh-Hant, light/dark/high-contrast; actual application locale/history/focus cases also passed.
- Gate navigation/card matrix: 43 width/locale/Skin combinations, including all 11 Skins in desktop English and four principal Skins in other combinations. Passed on isolated Edge and integrated 9961 Chromium. Real birth/transit, inactive channels, 37→40, 57→10/20/34, exact activation source, Back/close/Escape, touch and keyboard, center and library isolation covered.
- Integrated 9961 Penta hover and direct-details tests passed after the final locale/focus changes.
- Functional/localization/shared-detail units: 41/41 pass, no skips.
- Related fixed-source/history/mutation audits: 74 pass, no skips. Worktree initially lacked rollup; existing root node_modules was linked and only affected files rerun. No dependency changes.
- `npm.cmd run build:pages` and `npm.cmd run check:pages-bundle` passed. This creates a local static bundle only; no deployment. Existing runtime-resolved font CSS and large-chunk warnings remain.
- Adjacent integrated 9961 browser checks all passed: planet → gate → Back in birth/transit/timeline on desktop/mobile; channel label layout at 1280/390/320 across three languages and 11 Skins; reference desktop/mobile flow; timeline channel/gate/center heading layout at 873/390. No full local engine/annual/all-browser sweep was run for this small UI iteration.

The initial integrated direct-module test hit stale Vite HMR module identity after integration/build. Failure evidence is retained in `artifacts/issues-27-22-23/9961-details*`. Restarting the identified project Vite process at 9961 cleared the module graph; the same 43-case test then passed unchanged. No product workaround or assertion reduction was introduced.

## Screenshots and limits

Integrated gate/navigation screenshots: `artifacts/issues-27-22-23/9961-details-clean/` (1380/390/320, three languages, light/dark cards). Penta screenshots and red/green evidence: sibling worktree `issue27/artifacts/issue27/after/`; implementation records in ISSUE-27.md and ISSUE-22-23.md. Key desktop/mobile files were staged for user review.

Mobile results use browser viewport/touch emulation; physical iOS Safari and Android hardware were not tested. No new production verification is claimed. Dev push triggers the existing non-deploying premerge workflow; Pages workflow is limited to main/manual dispatch. No Netlify command, hook or setting was touched.
