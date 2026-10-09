# Gate numeral ink V2

Base 1883dbfa0c5e35567897c8b2786286ff20259ee8; branch fix/bodygraph-source-contrast.

Retains all eleven requested active/inactive ink pairs. Numerals use preferred → alternate → adaptive only when required for 4.5:1. Stripe backing remains conditional and uses coordinated Skin ink colors. Source small-text/Tooltip contrast logic remains independent. No old source/center colors, astronomy, topology, ownership or geometry changes. Removing the two new ink declarations from each Skin CSS must reproduce the previous file byte-for-byte; historical scope guards remain, with a new narrow V2 scope layer.

Validation: build PASS; 394 unit tests, 391 pass, 3 skip, 0 fail. 3960 browser matrix cases PASS, with preferred/alternate selection assertions, eleven Skins, nine palettes, custom light/dark/opposite colors and desktop/mobile. Minimum numeral contrast 4.5024:1. Transit source strategy, appearance linkage and full Skin presets E2E PASS.

Before/after contact sheets: [desktop](gate-ink-v2-evidence/all-skins-desktop.png), [mobile](gate-ink-v2-evidence/all-skins-mobile.png). Left is 1883dbf, right V2. Fixed Classic palette and same birth input 2000-05-10 12:30 UTC+8; additional fixed graph fixture shows P34, D10, Both20, inactive15 in defined G, inactive64 in undefined Head.

## Relationship E2E process exit investigation

Previous run printed all assertions passed but remained alive for more than four minutes; it was terminated and is NOT counted as an exit-code-zero pass. That run had no close-stage log or active-handle dump, so its precise root cause cannot be established retrospectively.

Diagnostic rerun with DEBUG=pw:browser and a wrapper logging resources after module completion exited 0. Assertions finished 2026-10-09T01:54:11Z; graceful close started 01:54:11.398, Chrome exited 0 at 01:54:11.730, cleanup completed 01:54:11.740. process.getActiveResourcesInfo() returned [] and no active handles were printed. Installed Chrome emitted macOS display/GPU/updater warnings, but they did not prevent this exit and are not evidence of the original hang's cause.

Added explicit browser.close start/completion logs and a 30-second cleanup-only failure watchdog. It exits 1 with resource diagnostics if close stalls; no successful forced exit, assertion change or timeout extension. Original assertion/navigation timeouts unchanged. Final standalone rerun printed both cleanup markers and exited 0 (about 51 seconds); this run is counted as passing. This prevents indefinite cleanup from masquerading as a completed successful test; original intermittent root cause remains unconfirmed.

No PR, main merge or deployment.
