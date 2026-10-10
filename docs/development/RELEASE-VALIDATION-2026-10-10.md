# Windows development release validation

Release target: normal merge from `dev/windows-development` to `main`, followed by GitHub Pages at `https://nothingnessvoid.github.io/TD-OHD/`. Production verification must precede closing Issue #24. Existing branches/worktrees and old Netlify are preserved.

## Scope and evidence

The accepted UI starting point is `8475a4a12311089f64dbec1ba8b37449cd238537`. Release stabilization preserves the engine and knowledge algorithms. Team/Penta has shared person editing, transactional selection and automatic analysis; font preference is independent from Skin; channel badges and mobile library details use shared navigation.

- Windows full unit suite after ACL integration: 485 tests, 482 passed, 0 failed, 3 default online skips. Command: `node --test --test-concurrency=1 tests/*.test.js`. All 3 online tests separately passed with `OHD_ONLINE_TESTS=1`. The default concurrent local run encountered two .NET compiler output-file contention failures; running the identical suite serially passed without assertion changes.
- Windows local privacy: 7 tests passed, including account/save/restart, migration of existing wide/protected ACLs, inheritance/propagation flags, DB/WAL/SHM, backup JSON/tmp, link rejection, runtime backup junction, and permission-command failure. Existing data permissions are repaired before SQLite opens. Linux CI also passed the integrated full unit suite and actual POSIX permission checks.
- Browser coverage inventory: 66 unique E2E/deployment scripts. The owned non-Team report and test-source hashes are in `tests/browser-regression-coverage.md`, `tests/browser-regression-results.json`, and `tests/browser-regression-source-hashes.json`. Team/Penta/shared-detail owner ran 14 scripts; four additional general Team flows passed after migration. Parent checks cover font/export, channel labels, mobile reference, sharing, reference V1, detail layout, LAN and real static deployment. Final assertion-audit follow-ups are recorded separately below.
- Real built `/TD-OHD/` smoke passed actual custom-font rendering, WASM birth, navigation, three-person Penta and mobile library sheet. Full static deployment smoke passed lazy engine loading, repeated-birth runtime reuse, relationship calculation, manual Team input, custom transits, 30/90/180-day ranges, 2021/2026/2036 files, cross-year/cache reuse, asset MIME and pinned Swiss hashes.
- LAN `192.168.10.99:9961` passed UUID/hash fallbacks, people/team persistence, birth calculation and private-resource denial. Firewall configuration was not changed.
- Pre-merge Linux workflow includes the production deployment browser gates, built-subpath check and full static smoke. Exact final commit/workflow outcome is recorded in the PR and release completion report.

## Historical and numerical boundaries

Frozen source manifests and negative mutation checks remain intact. Reviewed release changes use exact fixed-commit projection layers. The five UI baseline comparisons use an independently served `8475a4a` accepted starting snapshot. Old Phase 4C/pre-layer differences remain failed historical evidence, not claimed historical parity.

Linux retains the original Swiss historical fixture thresholds. Windows compares all 234 planetary speeds exactly with independently rebuilt pinned production `cb29ace`; original longitude/activation/mechanics checks remain. `WINDOWS-NUMERIC-EVIDENCE.json` documents that this establishes no candidate regression, while the identified Windows independent-C speed residual remains slightly above 1e-8. Universal C/Sharp exactness and Windows agreement with the old cross-platform speed snapshot are not claimed.

PNG downloads embed the selected font and show glyph differences from the system fallback; exact screen/export pixel identity is not claimed because html-to-image normalization/rasterization differs. Existing licensing open items remain documented in `docs/release-licensing-v1/open-items.md`.

## Final audit follow-ups

- Timeline center-layout fixture moved from six seconds before activation into the active interval; channel/gate/center desktop and mobile geometry assertions pass unchanged.
- Penta hover waits for restored birth startup to complete before navigating; this fixes a Linux test race without changing product code or hover/focus checks.
- People-editor out-of-order-response injection and mobile review back-button geometry received a final validity audit; their follow-up results must pass before merge.
