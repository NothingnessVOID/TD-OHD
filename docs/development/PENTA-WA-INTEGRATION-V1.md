# Penta / Wa development package integration v1

## Baseline and input

- Remote main verified at `f7cb220b880b54d482ca5c23889123f39c2c632e`; clean local `dev/windows-development` fast-forwarded from `01cb43da79f531c982a7e67c36a3201b82cf8d86`.
- Active feature branch: `feature/penta-wa-integration-v1`.
- Input attachment: `TD-OHD-Penta-Wa-Development-v1.zip`.
- ZIP SHA-256: `eff4543ba380ab5db4b2f554272d983b16b0d0f79d9af912ad651aa3dd38e13a`.
- Package contains 66 files including MANIFEST.json; all 65 listed files matched byte counts and SHA-256, no extra files.
- Input package tests: 59 passed, zero failures/skips, using `TD_OHD_REPO` and `TD_OHD_REQUIRE_BASELINE=1` for its pinned website compatibility test. This verifies the package and its pinned test baseline, not the completed integration.
- Package website baseline is older (`aee63103`); integration follows current website interfaces and calculation behavior, not whole-file replacement.

## Staging and identities

Phase 1 integrates Penta and is validated/reported before Wa implementation starts. Existing 21 Penta IDs remain: three overview articles, twelve gates and six canonical channels. The package's eleven mechanism articles include those three overviews, so eight new IDs produce 29 total records, not 32. Stable `hd.penta.*` identities and original topology/provenance properties are preserved.

Summary and Detail are independent locale-specific slots. New content may be AI editorial-reviewed with traceable sources; that does not imply human approval, scientific validation or verification of all underlying mechanisms. Old structural verification cannot be used to promote whole interpretive articles to verified. Source references and editorial limitations are retained in content metadata. No global terminology changes are authorized.

Mechanism articles receive separate library reading access. Graph, member contribution semantics, colors and topology remain the existing implementation. Full I Ching names use `hexagramName()` independently of individual Human Design `gateName()` and Penta skill names.

## Phase 1 completed

Penta content, shared readers and mechanism library are integrated. Product snapshot `f347ff011e20e951c94b7dcf9f745a976b972399` includes the independent summary policy; parent integration tests and source audit follow it as separate commits. All 29 IDs have complete three-language reading, and the 11 mechanisms are available at `#library?filter=penta-mechanism`. Ordinary Penta topology, engine and TeamRepository files remain unchanged.

Validation: 38 related unit tests passed in the parent workspace; 261 article reads passed across three languages × 1440/390/320 × 29 records. Existing shared-object/heading, reference, Penta direct-detail, background-knowledge and hover/dismissal E2E passed on 9961. Static frontend build passed. 135 related source/history/licensing audit tests passed while preserving old snapshots and mutation negatives. Independent review confirmed summary/detail isolation, source rejection and no package-to-verified fallback. Physical mobile/Safari and a new all-feature computational sweep were not performed.

9961 screenshots: `artifacts/penta-v1/9961/1280-mechanisms.png`, `390-mechanism-reading.png`, `320-mechanism-reading.png`; deeper gate/channel screenshots remain in the isolated UI worktree's `artifacts/visual-review/penta-reading-v1/`.

## Wa preparation boundaries

The package has no LICENSE file or package license field. The reference engine is inspected as a specification/test reference; it is not copied over the site's existing calculation engine. Deterministic structural union, manual grouping and manually selected Alpha can be implemented with existing website primitives and an independent Wa module.

Persisted Wa configurations require a distinct versioned refs-only contract; the supplied runtime model permits birth/chart and is not copied into persistent storage. Existing TeamRepository v2 and its Penta records remain compatible. Member pool, three named Penta roles, manual Alpha, six communication themes, contribution/difference display and revision restore are planned. Automatic Alpha, formal Gap/Triggering/Powerbases scoring and formation algorithms remain unsupported extension points.

Canonical pair identities normalize 45-21→21-45, 51-25→25-51 and 59-6→6-59. Original content IDs/display ordering may remain aliases; they do not create duplicate computed identities.

## Phase 2 completed

Wa v1 is mounted as an independent navigation workspace (`?view=wa`). It supports an existing-person pool, three manual Penta roles, manual Alpha, standard/observation drafts, a simple organizational schematic with editable member lists, six communication themes, contributor details, structural/member/group comparison, save/list/history and restore-as-new-revision. The supplied 14 Wa articles are independently available in all three languages. Canonical and reversed/full content IDs resolve to the same identities without cross-language fallback.

Persisted snapshots are `kind: wa`, `schema: wa-refs-v1`, validated by strict Ajv Draft2020-12 plus identity/layout rules. `ohd-wa-refs-v1` IndexedDB commits head checks and immutable revisions atomically; PeopleStore/Team data are untouched. Runtime analysis reuses the site's 26-activation extractor and unchanged Penta calculation; the six-theme union and diff are original implementation, not copied reference-engine code.

Final product snapshot: `52fcbae82836aeb033716b61b6ad79bd0b89c2d9`. Source approval covers exactly 13 paths, including nine new Wa files and four host/dependency files. Audit adaptation is separately pinned and reviewed. Final source guards and Penta compatibility checks: 103 passed, zero skipped. Parent integration batch: 48 related unit tests passed after updating the expected navigation list for Wa (47 initially passed and the corrected i18n file passed 12/12). Static build and Pages bundle check passed. Core isolated verification also covered 22 unchanged Team/Penta tests.

Final integrated Chromium E2E passed on 9961: real WASM/core analysis, actual registered light/dark Skins (not only the compatibility data-theme attribute), 1440/390/320 × three languages (18 screenshots), reassignment with unchanged global coverage, individual derived changes, missing person data, observation mode, generation rejection, save/list/history/restore, conflicts and async read/write races. The real IndexedDB test passed two-page CAS, immutable collision rollback and reload persistence. Existing frontend-runtime restore/locale/no-sync/Connection/Team checks also passed.

Stage 2 limitations: the graph is a manual Alpha/three-group schematic, not the full original Wa diagram. Custom policy and interval certainty remain reserved; automatic Alpha, formal Gap/Triggering, automatic Powerbases, scoring/ranking and formation claims are explicitly unsupported. Manual Powerbase metadata is supported by the contract, while v1 UI currently provides explanatory content rather than an annotation editor. A low-priority UI boundary remains: a failed old list/history read may show a stale error message after a draft switch; it cannot overwrite draft or stored configuration. Physical devices/Safari and a new complete all-feature computational sweep were not run.

Screenshots: `artifacts/wa-v1/9961/desktop.png`, `mobile.png`, `mobile-detail.png`; validated Skin matrix at `artifacts/visual-review/wa-ui-v1/`. The latter deliberately includes escaped hostile-looking fictional names to verify text safety; these are synthetic test records, never injected into the user's browser profile.

## Delivery constraints

Only local Windows 9961 preview and feature-branch pushes. No main merge, GitHub Pages or Netlify deployment. No unrelated UI issue work and no original calculation-engine rewrite. Existing worktrees and private research inputs remain intact. Per-stage actual results and screenshots are added after validation; plans above are not a completion claim.
