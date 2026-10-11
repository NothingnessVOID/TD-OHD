# Penta / Wa v2 incremental integration

Baseline: `c379fbe6b9a1b4b472b900aeedc691275407c3f8`, verified clean and equal to remote `feature/penta-wa-integration-v1` before work. No new architecture or original chart/Penta engine replacement.

## Input verification

Full archive SHA-256: `b43bf5afbc4035d59337871cac1638fb129518b96520d7965d75d18614e980c7`. All 86 manifest entries matched byte lengths and hashes. Delta archive SHA-256: `9e888d8988672eae6a103889dab65d751482bc149300bfe53675991e2451571b`; full package is authoritative.

Package Node tests: 90 passed on initial run, one frozen-v1 sibling comparison skipped; a read-only junction to the original v1 input enabled that exact test, which passed with `PENTA_REQUIRE_V1=1`. Author-package comparison in website tests also passed with explicit `PENTA_WA_V2_INPUT`. Neither skip was counted as a pass.

## Stage A — content

Product commit `9b01fb87fce51648b4fddf4d0dcdd9defe8867c7`; tests `8ff0a56` and existing reader acceptance `88ca64d`. Penta expands to 30, Wa remains 14: 44 records, 132 locale versions. Existing 43 IDs/objectIds are retained; only `hd.penta.triggering` is new. Exactly five gate bodies (1,8,14,15,46), six connection bodies, five existing mechanism bodies and ten Wa bodies change. Seventeen prior records retain byte-identical locale fields while metadata is updated where specified. v1 source/review history remains version-scoped; v2 has independent provenance.

Actual Penta reader E2E: 270 reads (30 entries × three languages × 1440/390/320), including all 12 mechanism entries and navigation/close/focus/lenses. Existing reference flow passed with total catalog 229. No internal G-center edges, four-gate path completeness or formal Triggering calculation were added.

## Stage B — stable errors and persistence compatibility

`f4c8a3d` adds plain-JSON snapshot preflight and `prepareWaMembers`; `20a7ba3` adds strict optional annotation schema and DB2 compatibility, followed by `b370408` for legacy runtime-input compatibility. Existing valid refs-only `wa-refs-v1` records remain readable and retain their marker when saved without new fields. Adding consultation or manual edges explicitly uses `wa-refs-v2`; absent fields are not auto-filled.

Schema validation rejects unknown fields, unsafe keys, cycles, non-JSON snapshot values and invalid/non-timezoned savedAt. Runtime preparation validates all assigned identities and consumed birth fields before calling the existing provider, excludes pool members, and converts thrown null/string/Error to stable failure codes. Complete-chart activation contracts still apply; unrelated runtime optional data is not incorrectly treated as persistent JSON. Missing legacy timeUnknown means false; explicit invalid values remain errors.

IndexedDB retains its existing database/stores and all revision records, but version 2 fences old version-1 clients from overwriting unfamiliar fields. Upgrade is not a destructive migration. A blocked request that later reaches upgrade aborts. Restores append a new revision, retaining annotated history. Complete organization export includes head/history/annotation associations; explicit v1 export creates a backup plus annotation sidecar and does not downgrade the live database. Old application code cannot directly reopen DB2.

## Stage C — structural observations and manual records

`42cee23` adds opt-in groupCommunication and contributionTrace. Default valid analysis/diff outputs deep-equal the c379 implementation; manual fields and group views do not alter overall gate coverage. Each Penta's members-only view and members-plus-manual-Alpha view are separate. Trace preserves exact member/side/planet/gate/line changes and explicitly describes input changes, not performance causality. It requires original runtime result objects; serialized results report unavailable trace rather than fabricated detail.

Existing Wa page gains a collapsed manual-record section with consultation notes, per-Penta work scope/demand/skills, stable Gap intention records (wish_list/configured/observed), manually selected participating allies, and directed manual communication links. Users can add/edit/delete records, save/restore them, and export annotations or a complete backup. Same-direction links with different IDs/purposes are allowed. Moving participants or replacing Alpha requires explicit confirmation before affected records are removed; confirmation is bound to the shown snapshot and generation. Restoring an unannotated revision warns even when current edits are saved; original annotated history remains intact.

Unknown Powerbase composition remains not provided. Automatic Alpha, formal Gap/Triggering, Alpha Lock, Powerbase calculations, scores/rankings and interval certainty remain unsupported. No new professional formulas were invented.

## Final source and browser validation

Final product source: `81ae135fad2bdd1b5b805d57e5c99b51a0b16bdf`. The independent review found two UI issues: replacing input nodes interrupted Chinese composition, and editing existing edges populated absent optional label/note. The final patch preserves native input nodes and tracks actual optional-field edits. The reviewer confirmed both resolved without a new blocker in the reviewed scope.

Final 9961 evidence (Chromium, fictional data in isolated profiles):

- `wa-v2-ui-e2e.mjs`: complete manual workflow, eight IME input categories/Chinese save, optional-field absence/explicit clear, scoped group/Alpha views, contribution trace, stale confirmation and export; 99 registered Skin × language × viewport checks passed, with 18 light/dark screenshots.
- `wa-ui-e2e.mjs`: existing real-WASM analysis, responsive locales/themes, save/list/history/restore/conflict, stale snapshots and observation mode passed.
- `wa-repository-e2e.mjs`: real IndexedDB, simultaneous-tab CAS, reload/history, seeded old v1 revisions, v2 annotations/export, old-client fence and blocked-upgrade rollback passed.
- `wa-v2-prepare-e2e.mjs`: real computeChart output, missing legacy flag, unrelated optional undefined, explicit unknown noon and unchanged refs snapshot passed.
- `e2e.mjs`: all 24 main application checks passed, including live place/timezone search, birth/relationship/Team/transit flows, shared links, theme and reload.
- Final static build and Pages private-client exclusion check passed. Existing two font.css runtime-resolution warnings and oversized chunk warning remain.

A source approval remains fixed at `9b01fb8`, B at `20a7ba3`, C at `81ae135`. Final audit candidate `5607d17ded4914beca66ca62b2618b59c2ea966d` was independently reviewed before approval. Thirteen product paths are allowed; only prepare.js is new. Original A approval, historical snapshots, inventory checks and file-specific mutation rejection remain intact.

The first full serial Node regression executed all 616 tests with the author package and online tests enabled: 607 passed, nine failed, zero skipped. Three online failures were Node's direct Open-Meteo connection timing out; the process had HTTP(S)_PROXY but had not enabled Node's environment-proxy support. With `NODE_USE_ENV_PROXY=1`, all three online tests passed. Two stale reading expectations (99→100 with Triggering, and the previously adopted editorial-reviewed reading policy) were corrected without dropping negative review/content guards; all seven tests in those two files passed. Four historical projection assertions were repaired in the independently reviewed follow-up `aefa30df70cb5af623d5009f57cb49933f44a76c`: three direct legacy calls now validate final source first; the Variable renderer check uses the existing guarded projection and adds byte-mutation rejection. The four original failures passed, with 24 existing plus two new checks passing in that targeted run. Fixed source/audit pins were retained; only exact approved test patches can be normalized. The original failure log is retained at `artifacts/wa-v2-full-regression.utf8.log`.

After approval, the parent reran all scope tests, the exact follow-up tests, Variable cleanup, and both shared-reading files: **107/107 passed, zero failures/skips** (411.6 seconds). An earlier 180-second attempt was interrupted by the command timeout with no assertion failures; it is not counted as a completed pass. Across the full run and targeted reruns, all original 616 cases now have passing results, plus the two new follow-up tests: **618 distinct cases passed**, with no remaining known failing case. This is consolidated evidence, not a claim of a second all-618 single invocation. No product source changed after `81ae135`.

Reproduce the full suite with Node 24, the author package path in `PENTA_WA_V2_INPUT`, `OHD_ONLINE_TESTS=1`, and `NODE_USE_ENV_PROXY=1` where the environment uses HTTP(S)_PROXY: `node --test --test-concurrency=1 tests/*.test.js`. Tests depending on old Git snapshots require full history. Final scope log: `artifacts/wa-v2-final-scope.log`.

Physical-device/OS IME and WebKit testing were not performed; composition event/DOM identity checks use Chromium automation.

Final browser-test source hashes (unchanged after passing):

| Script | SHA-256 |
| --- | --- |
| wa-v2-ui-e2e.mjs | 58ea3cde0d070c465710dfa2d1a45a67356ab9b87be2ade9292702965a7d92c8 |
| wa-ui-e2e.mjs | 5038e1ad831240c54a987c864beba430325bf30edd300eb5c1aaa4cf5cecd422 |
| wa-repository-e2e.mjs | cc3ad66774bfbcea0a2b95a17041f229054a70c0b91d283a0c67ab470c6092b9 |
| wa-v2-prepare-e2e.mjs | 8ea451d0c7d477ea7f72bdcb8f836f1e0fda04925820b1368dec324af6014ca1 |
| e2e.mjs | 11114c98e41db1914b44a10dee4dba2976f2ef055f4ed68a772db88065fe0ac6 |

## Delivery and rollback

Local preview is `http://127.0.0.1:9961/`, LAN `http://192.168.10.99:9961/`. Only `feature/penta-wa-integration-v1` is pushed; no main merge, Issue closure, GitHub Pages or Netlify deployment. Remote main remains `f7cb220b880b54d482ca5c23889123f39c2c632e`.

Audit snapshot history is attached to the feature branch using an ours-strategy history merge with identical trees before/after. This makes the original fixed audit commit objects available to another computer through a normal full clone/fetch; a shallow clone must fetch enough history for source guards.

Code rollback reference is v1 `c379fbe6b9a1b4b472b900aeedc691275407c3f8`; Penta-only stage reference remains `f278e419e605e65d6f7ec501857bdc896103e2fa`. Rolling back code does not downgrade DB2. Export complete backups first; old code cannot open the upgraded database, and v1 export with its annotation sidecar is an explicit backup conversion, not a live database downgrade.

UI exposes manual records, per-group/with-Alpha observations, trace and full/annotation exports. The lower-level explicit v1 export/downgrade API is implemented and tested but has no live database rollback UI. Unknown Powerbase composition stays unavailable; existing manual Powerbase notes are preserved and reference-protected, with no automatic Powerbase editor or scoring added.
