# Issues 22 + 23 — gate navigation and channel gate cards (commit B)

Base: `f436587116ab605eb1d9ff1b50c333bd7c23cdcc`.
Branch: `fix/issue22-23-gate-navigation`.

## Behavior and reuse

- `renderChannelJump` accepts an optional source gate. Only gate detail supplies it; each associated channel gets its own harmonic gate button, including inactive channels. Gate 37 links to 40; gate 57 links to 10, 20 and 34. Center call sites and their channel-only layout remain unchanged.
- The button uses existing `Harmonic gate:`, `Gate {gate}` translations and `gateName()`. The existing Chinese labels are “谐波闸门：” / “諧波閘門：”. No message catalog or Knowledge file changes.
- Both channel gate cards show the existing accent `.detail-label`, main `.detail-name` from `gateName()`, existing transit/inactive badge and `View gate details` action. The whole native button remains clickable and supports Enter/Space; its accessible name includes its visible number, name, status and action.
- Reuses `showGateDetail`, `detailHistory`, `goBack`, shared dialog focus/Escape/close behavior, and existing birth/transit context. No new navigation state or data model. `refreshTransitDetail` now forwards `currentDetail.source` so locale redraw preserves the selected birth-planet activation inside Transit.
- Reuses `.reference-link`, `.transit-detail-link`, shared detail typography and existing `--accent`, `--accent-soft`, `--text`, `--border`, `--focus` tokens. No new token or shared component.
- `.chart-channel-gates` scopes the new grid/title/hover styles to this renderer; at <=480px cards use a single column. The existing `.transit-channel-gates` rules used by Knowledge/Penta/library are unchanged.
- Only channel rows containing the new harmonic button wrap circuit badges. This fixes the 320px English gate-57 overflow from the Individual + Integration labels without changing center rows.

## Validation

Environment: Node 24.19.0, installed Microsoft Edge through Playwright, isolated `http://127.0.0.1:19968`; 9961 remains parent-managed. `node_modules` and `public/engine` are junctions to the main repository. No install or WASM rebuild.

Commands:

```powershell
$env:CHROME_CHANNEL='msedge'
node tests/issue22-23-details-e2e.mjs
node --test tests/i18n.test.js tests/localization.test.js tests/transit-localization.test.js
node node_modules/vite/bin/vite.js build --mode static
node --check src/views/chart.js
git diff --check
```

- Targeted browser matrix: 1380, 390 and 320 CSS px; English, Simplified Chinese and Traditional Chinese. Desktop English covers all 11 registered skins. Every remaining width/locale covers default light, default dark, high contrast and midnight contrast.
- Tests cover real birth/transit SVG callbacks, deterministic all-inactive transit fixture using production `buildTransitGraph`, 37→40 and all 57 counterparts, gate→channel→gate→back, locale redraw with history, exact selected activation side/planet/value preservation along planet→gate→counterpart→back, context and activation preservation, full-card clicks, Enter/Space, touch, Tab trap, Escape and close cleanup/pin reset. Center entry and library's visible owner/four gate lenses are checked.
- The locale tests passed 23/23. Static frontend build passed using reused WASM; Vite reports existing font CSS runtime-resolution warnings and the >500kB chunk warning. Font assets are present in `public/fonts` and the build output; no unrelated asset change was made.
- Final browser results are recorded in `artifacts/issue22-23/results.json`. Screenshots include each width/locale's gate-57 identity header and three entries, light/dark channel sheets and cropped 37/40 cards. Artifacts are ignored and not committed.
- Initial Chrome launch failed because the Chrome channel was not installed. Edge is used explicitly. Two initial test assertions were corrected to use source text rather than CSS-uppercased `innerText`; screenshots/JSON failures were retained. A real 320px circuit-badge overflow was found and fixed with the scoped rule described above.

## Boundaries

Only `src/views/chart.js`, `src/styles.css`, this document and `tests/issue22-23-details-e2e.mjs` belong to commit B. No engine, knowledge prose, storage, Penta matrix, shared-object renderer, source audit or locale changes. The parent owns component inventory and frozen-source audit. No push, merge, deployment or issue closure. Full suites, annual timeline sweeps and cross-browser/WebKit/physical-device verification are outside this targeted UI pass.
