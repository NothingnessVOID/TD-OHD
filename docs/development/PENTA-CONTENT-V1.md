# Penta content v1 integration

Base: `f7cb220b880b54d482ca5c23889123f39c2c632e`. Input: supplied, hash-checked `penta-wa-development-v1` package. This integration performs no new web research, engine port, UI change, registry/schema change, publication or deployment.

## Reader and UI contract

- 29 records: all 21 existing stable identities replaced in their existing order, then eight new mechanisms. 12 gates + 6 channels + 11 mechanisms. Domain `human-design`, objectType `penta`; objectIds remain `gate:N`, `channel:N-N`, or the mechanism name.
- `name`, `summary`, `detail` read exactly their own locale/field lazily; no summary/detail or language fallback. All 87 locale records have independent complete summaries and details. Slots declare `format: 'plain-text'`.
- All authored slots and names use the registered independent source `penta-wa-development-v1`, never `unknown` or the old official topology source.
- `properties.interpretationStatus = 'editorial-reviewed'`; `properties.evidence.status = 'editorial-reviewed'`. `properties.editorialReview = { actor: 'AI editorial team', status: 'complete', humanApproval: false }`.
- Schema-compatible entry/slot `reviewStatus: 'reviewed'` means AI editing and internal checking are complete. It does not mean human approval, scientific validation, official confirmation of every sentence, or release authorization.
- Original 21 records retain identity/property source provenance, computed/topology fields and unresolved algorithm keys. Their original verified evidence object is preserved as `properties.structuralEvidence`, scoped to the old structure claims. It does not authenticate the replacement prose. New mechanisms have no invented structuralEvidence.
- `properties.sourceRefs` normalizes `sourceId = ref.sourceId ?? ref.id` while preserving the original `id`, locator, scope/use and all other reference fields. `evidence.sourceIds` is a convenience projection, not the global SOURCES whitelist. Raw records and `sourceRegistry` retain all original source keys in the JSON.
- Package `semantics`, `metadata`, `limitations` (also `technicalLimitations`), editorialStatus, releaseDecision, packageReviewStatus and decisionRationale remain available. Gate `term`, `originalTerm`, `hexagram` and `natalTitle` remain distinct. Gate names are Penta-specific; the UI owns any `hexagramName` display.
- UI can allow the explicit editorial path with complete AI metadata/sourceRefs, retaining its existing strict verified path for other content. Do not simply label the new corpus verified to open the UI.
- `pentaTextParagraphs(text)` from `src/lib/knowledge/content/penta.js` splits plain text paragraphs, including CRLF. It emits no HTML and is NOT an HTML sanitizer: render every returned string with `textContent` or the existing escaping helper. Never put the returned source strings directly into innerHTML. This phase does not modify the shared renderer.

## Evidence and audit retention

`src/lib/knowledge/content/penta-v1.json` stores the unmodified 29 package records, the 14 referenced source registry entries, input manifest hashes and two separate review passes (`reviewHistory.crossReview` and `reviewHistory.resolution`). Cross-review hashes describe the earlier gate/channel revision and its unresolved copy edits; resolution hashes describe final delivered text. Both are kept, without rewriting the earlier review to appear current. `resolution.human_approval` and package editorialReview.humanApproval remain false.

Official GAP02 supports the twelve skill vocabulary, not a full official gate mapping. GAP03 explicitly supports Gate 31 Administration. PV2-S05 and PV2-S07 supply attributed third-party gate mappings and comparison tables, including remaining Gate 7 mapping in channel 7-31. Family examples and functional pairings are editorial applications. Repository references support topology and deterministic coverage; P1/P2 support scoped section descriptions, not authentication of three continuous Sacral-to-Throat paths. Local three-Channels wording remains a recorded limitation. Per-record refs/limitations retain these boundaries. All new full-text interpretation therefore stays editorial-reviewed, even where one component claim has stronger evidence.

The independent SOURCES entry is local editorial provenance (`type: 'td-ohd'`). Official, third-party, local-document and repository origins are recorded individually in the JSON sourceRegistry; no blanket official lineage is claimed. Historical local source paths identify package provenance and are not runtime file dependencies. No reference engine or source documents are copied.

## Exact inventory

Gate IDs: `hd.penta.gate.1`, `hd.penta.gate.2`, `hd.penta.gate.5`, `hd.penta.gate.7`, `hd.penta.gate.8`, `hd.penta.gate.13`, `hd.penta.gate.14`, `hd.penta.gate.15`, `hd.penta.gate.29`, `hd.penta.gate.31`, `hd.penta.gate.33`, `hd.penta.gate.46`.

Channel IDs: `hd.penta.channel.1-8`, `hd.penta.channel.2-14`, `hd.penta.channel.5-15`, `hd.penta.channel.7-31`, `hd.penta.channel.13-33`, `hd.penta.channel.29-46`. Display endpoints remain `[8,1]`, `[2,14]`, `[15,5]`, `[31,7]`, `[33,13]`, `[46,29]` respectively.

Existing mechanisms: `hd.penta.introduction`, `hd.penta.powerColumn`, `hd.penta.contexts`.

Added mechanisms: `hd.penta.size-formation`, `hd.penta.structure-vs-individual`, `hd.penta.skill-gap`, `hd.penta.contributions`, `hd.penta.cross-member`, `hd.penta.duplicates`, `hd.penta.three-paths-six-links`, `hd.penta.alpha-bg5`.

Referenced source keys: GAP02, PV2-S05, PV2-S07, penta-structure, website-hd-catalog, delivery-iching-list, GAP03, repo:aee63103, J1, P1, P2, doc_9ecb8a422f2f76bc2c3a897de4ae3504c7435fdd47a8c780eead0f0c417d86f7, S21, S06.

## Validation

Targeted tests: `node --test tests/penta-content-v1.test.js tests/penta-knowledge.test.js tests/knowledge-layer.test.js`. Dependency directory is a junction to the root checkout's node_modules. Full suite, source guard and UI checks belong to parent integration. New tests are delivered in a follow-up commit to unblock UI work with the source commit first.

Executed: the three targeted test files pass all 19 tests (7 new content tests, 3 updated Penta tests, 9 existing knowledge-layer tests). A direct deep-equality comparison confirms all 29 raw records, 14 source entries and both review histories match the supplied package. Vite's JS transform accepts the JSON import syntax. Mechanism classification explicitly checks all 11 topics: original three retain their existing kinds; eight new topics have kind `mechanism`, never `gate`. No full build or full suite was run.
