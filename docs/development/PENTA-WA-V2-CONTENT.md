# Penta / Wa v2 content integration

Base: `c379fbe6b9a1b4b472b900aeedc691275407c3f8`.
Branch: `feature/penta-wa-v2-content`.
Source commit: `fa9b8983a4bd712d6ddc82471113d452693ba671`.
Author input: `penta-wa-development-v2-input/penta-wa-development-v2` in the workspace root. `HANDOFF.md`, `integration/V2-UPGRADE.md`, `integration/ADAPTER.md`, `CHANGELOG.md` and `changes/DELTA.json` define this increment.

## Scope and integration order

Cherry-pick the source commit first, then the independent test/documentation commit. The source commit changes exactly five files: the existing Penta JSON, its source constant, Penta foundation content versions, the source registry and the existing Wa JSON. No engine, schema, store, UI root, mechanism algorithm, ordinary chart catalog or Wa reader/alias changes are included. The parent owns UI count-test updates from 11 to 12 mechanisms and 29 to 30 Penta records, full-suite integration, build and browser acceptance. No push, main merge or deployment was performed.

`src/lib/knowledge/content/penta-v1.json` is intentionally the **current content compatibility path**, now containing `contentPackage: penta-wa-development-v2` and `contentVersion: 2`. Its filename and storage schema marker remain stable; neither is the editorial package version. No second old/new corpus file was introduced. The root application package version is unchanged; author package `2.0.0` is recorded in `reviewHistory.v2.package`.

## Inventory and exact changes

44 stable content records, with 132 independent locale records (`zh-CN`, `zh-Hant`, `en`): 30 Penta (12 gates, 6 channels, 12 mechanisms) and 14 Wa. All previous 43 IDs, objectIds and objectTypes survive. The only new record is `hd.penta.triggering`. Existing record order remains stable in each corpus. The foundation reader retains its original 21 structural entries in their original order, then the existing eight additional mechanisms and Triggering.

| Category | Body changes in all three languages | Metadata only / unchanged body |
| --- | --- | --- |
| Penta gates | 1, 8, 14, 15, 46 | 2, 5, 7, 13, 29, 31, 33 |
| Penta channels | 1-8, 2-14, 5-15, 7-31, 13-33, 29-46 | None |
| Existing Penta mechanisms | powerColumn, contexts, skill-gap, cross-member, three-paths-six-links | introduction, size-formation, structure-vs-individual, contributions, duplicates, alpha-bg5 are wholly unchanged |
| Wa topics | penta-roles, alpha, gapping, powerbases | penta-and-wa, scale-and-template, membership, extension-and-context |
| Wa communication | All six existing records | None |

Thus 26 existing bodies change, 17 existing bodies remain byte identical and one new body is added. The dedicated base-comparison test reads the pinned Git base, independently asserts this exact set, compares UTF-8 name/summary/detail bytes for every unchanged locale, checks metadata-only deltas and whole-record equality for the six untouched mechanisms. It does not substitute current content for the old baseline.

## Source, review and metadata provenance

Penta authored name/summary/detail references and entry versions use package content version 2 and the independent registered `penta-wa-development-v2` source. Original verified structural identity/property sources keep their version 1 and their scoped topology evidence. Interpretation remains `editorial-reviewed`; `humanApproval` remains false. Triggering has no invented verified structural evidence.

The existing reading policy already compares the active package name/version, editorial metadata, source references and exact localized slot text. It was left unchanged. Invalid package versions, missing review metadata, unrelated text and borrowed verified status remain rejected. Summary and Detail remain separately lazy and never fall back to one another or another language.

The Penta JSON retains the exact raw author records. Wa `content-data.json` is deep-equal to the author's 14 v2 records, including original IDs, semantics, `gatePair`, `theme`, aliases, sourceRefs, limitations and evidence classifications. `src/lib/wa/content.js` is unchanged; canonical aliases such as `21-45` to package `45-21` continue to resolve. The v2 Management title is `45–21 Management: Education and Implementation`; the canonical display prefix remains `21-45`.

Provenance fields in the existing Penta JSON:

- `sourceRegistry`: the 40 referenced source entries for both corpora, each retained exactly from v2 `sources/resolved-registry.json`.
- `inputFiles`: byte counts and SHA-256 hashes of author content files, source registry and specialist reviews, review reports, DELTA and author package metadata.
- `inputDocuments`: original document-level metadata from all four author content files, including their schema/version, source registries, review version and decisions, excluding only records already stored in their runtime corpus.
- `specialistReviews`: exact `sources/gates-specialist-v2.json`, `sources/penta-mechanisms-v2.json` and `sources/wa-specialist-v2.json` documents, retaining the author's review versions and evidence boundaries.
- `history.penta-wa-development-v1`: exact previous package metadata, source entries, input hashes and review history, without duplicating the old body corpus. Full old records remain in the pinned Git base.
- `reviewHistory.crossReview` and `.resolution`: original v1 reviews kept unchanged. Their explicit `versionScope` is v1. The unchanged author resolution report still hashes v1 gates/channels and does not approve v2 text.
- `reviewHistory.v2`: author package `2.0.0`, editorial check, v2 release check and DELTA. Its scope is explicitly v2. Review outcomes describe supplied editorial/automated checks, not blanket official verification or scientific validation.

Both v1 and v2 SOURCES registrations remain available. The v1 registry/review pointers now resolve into `history.penta-wa-development-v1`, so historical provenance cannot accidentally point at v2 sources. The v2 registration points to current sources and `reviewHistory.v2`.

## Validation and reproduction

Executed with Node `v24.19.0`:

```text
node --test tests/penta-wa-v2-content.test.js tests/penta-content-v1.test.js tests/penta-knowledge.test.js tests/wa-content.test.js tests/knowledge-layer.test.js
```

Result: **29 tests passed, 0 failed, 0 skipped**. Coverage includes all 44 static entries and 132 locale records through actual readers and Penta qualification policy; independent slots and no fallback; stable identities and topology; exact DELTA/body comparison; scoped v1/v2 provenance; unchanged Wa aliases and reader; and exact source-input/hash comparison. `git diff --check` also passes.

The new test uses pinned Git base `c379fbe6b9a1b4b472b900aeedc691275407c3f8`. Preserve that commit in repository history. Author-file equality checks use the sibling input path by default; set `PENTA_WA_V2_INPUT` to supply another location. Only that optional external-input test skips when the author package is absent. The six base/runtime tests remain active and require no input package. All seven new tests ran in this worktree with the input package present.

The reference package result of 91 tests / 90 pass / 1 skip belongs to input-package validation and its missing frozen-v1 sibling. It is not a website integration result and was not rerun or repaired by this content task. Parent integration owns that input-integrity follow-up.

`tests/helpers/penta-wa-v2-input.mjs` reproducibly prepares staged JSON in the OS temporary directory from the pinned Git base and an author input directory. It checks raw generated-record equality, identities and DELTA before staging. It never writes repository source files. During this integration, staged data was applied to the two existing source paths through structured file write tools. Example:

```text
node tests/helpers/penta-wa-v2-input.mjs <author-input-directory> <temporary-output-directory>
```

The worktree's `node_modules` is a local junction to the root checkout dependency directory; it is untracked. No full build, full suite or browser run is claimed by this content-only task.
