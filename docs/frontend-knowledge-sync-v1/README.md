# Frontend release and Knowledge synchronization

The frontend fixes are on `main` and the existing Netlify production site. Knowledge Phase 5 receives those fixes by a merge from main; Knowledge content and features are not published to production.

## Immutable parents

- Previous main: `2bc308b7a9037a10bae92fff6c9ff536a276b8ae`.
- Released main / PR #15 merge: `bc9b217fab260b1017bfb1478141f864e402289e`.
- Knowledge before synchronization: `df06686baa855b01a8bbfb3d77cf85b34eaf4717`.
- Production deploy: `6ac37ca09b82e263c9b27f6f`, ready, <https://td-ohd.netlify.app/>.

Git automatically merged `src/main.js`; there were no merge conflicts. Its reviewed three-way output retains boot ordering, Simplified Chinese initialization, the Sync guard and People listeners, together with Knowledge locale refresh, shared detail access and the Knowledge Reference route listener.

## Verification boundaries

`validate.mjs` checks protected files against the immutable main and Knowledge parents. The only overlapping source is `src/main.js`, checked against Git's exact three-way merge output. Knowledge prose, astronomy code, annual data, package configuration, shared breakpoint configuration, root LICENSE and existing engine identity are protected. Notices and ephemeris hashes are checked against the actual distribution; historical Jovian runtime artifacts are forbidden.

The previous release and frontend review reports remain historical snapshots. .NET embeds the source Git revision in assembly metadata, so rebuilding the merge commit changes WASM filenames and hashes without changing calculation source. Main's tests used a refreshed **distribution inventory only**, retaining the committed frontend/source hashes unchanged; the committed snapshot was then restored. `main-build-review.json` records the actual clean main build uploaded to Netlify. No production source was changed during this refresh.

The synchronization adds only this merge verification and makes the existing English dialog-label unit fixture explicitly select English and restore its previous locale. It does not change the application's Simplified Chinese default or Knowledge wording.

## Validation

- Main: 273 passed, 0 failed, 3 original skips; build passed; localization 34/34; Timeline unit 63/63; runtime, place search, full Timeline/mobile, appearance, reference, planet and chart-export browser checks passed.
- Production: saved synthetic-person restoration, Chinese first frame, no Sync/auth requests, Connection/Team, 390/320 mobile layout, 180-day/year/past-year, zero-calculation Now, real Shanghai/温州市/Wenzhou search and no console errors passed.
- Knowledge: 303 passed, 0 failed, 3 original skips; build passed; localization 34/34; Timeline unit 63/63.
- Knowledge access: 12 exact Foundation/Variable comparisons (1224/903/664/390, English/Simplified/Traditional), 15 body/locale combinations and six reloadable deep links passed against the frozen pre-sync Knowledge source.
- BodyGraph: 24 exact DOM/text/geometry comparisons, including Transit, Timeline timing and shared controller transitions, passed against the frozen released main source.
- Frontend runtime, reference, full Timeline/mobile and chart-data export checks passed on the synchronized branch.

Temporary frozen browser baselines use their original Vite breakpoint plugin and separate dependency caches, with the verified modern engine assets. Verification moved to a temporary checkout outside iCloud after placeholder files and HMR reloads disrupted the first local run. All final results above come from the stable checkout; failed environment attempts are not counted as passes.

The engine signature remains `59b90e629033cc7faf95`. Neither the Knowledge branch nor its content was merged into main or deployed. Local 8787 was not modified. No branches were removed.
