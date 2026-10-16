# Wa v2 incremental UI

Branch: `feature/wa-v2-ui`. Baseline: `c379fbe`. Isolated preview: `http://127.0.0.1:19981/`. Node dependencies and the existing built engine are junctions to the primary checkout, not new installs or copied reference engines.

## Source ownership and integration

UI commits: `5c3f6d5` (early reviewable forms/scopes), `3715854` (UI contracts/reference protection), `6ba0273` (captured-draft confirmation identity), and `e6dfef4` (scoped delayed read errors). Apply them in order after the B/C source commits `10234da`, `26307b4`, `ba85698`. Local cherry-pick equivalents are `fbf8b85`, `472dac0`, `f59fe5f`. B's runtime compatibility follow-up `9302bb0` is also included locally as `60a7742`. The UI commits only change `src/views/wa.js`, `src/lib/wa/messages.js`, and `src/styles/wa.css`. Test and documentation delivery is separate. No modifications to main/index, content, model, schema, repository or analysis were authored by the UI task.

## Interaction and reused components

The existing header, pool, Alpha selector, three collapsible groups, schematic and six-theme cards remain. A default-collapsed Manual records section adds ordinary textareas and shared operation dialogs:

- Manual consultation problem, personal management notes and communication plan.
- Per-Penta work scope, demand and newline-delimited required skills.
- Gap intentions with stable IDs, current Penta, theme, reported wish-list/configured/observed stage and note; add/edit/delete preserve IDs.
- Manual key allies selected only from current participants.
- Directed manual links with stable edge IDs, participating from/to members, label and note; add/edit/delete. Each contact has its own stable ID; reverse direction remains distinct. Endpoint validity is checked by the model.

Existing `openOperationDialog` supplies focus trapping, Escape, background inertness and focus return. Native details are persisted in local view state through re-renders. Required skills preserve line breaks while typing. All rendered user text uses escaping; no JSON textareas or machine audit metadata in normal forms. Semantic Skin tokens style all additions, with 44px controls and wrapping layouts at narrow widths. Messages cover English, simplified and traditional Chinese.

The structural results select all participants or one Penta. A selected group has a separate group-only six-theme section and an independently switchable group-plus-manual-Alpha section. Each details dialog reads contributors from its exact scope; neither option changes the global union. Manual links remain in their own section and do not become structural channels or schematic edges.

`diffWa(...,{includeTrace:true})` uses original analysis result object identities. Short collapsed details show activation count changes and affected member/gate.line records, including line-only changes with unchanged gate union. There are no performance/mechanism inferences.

## Data protection

Opening forms or loading/saving an unchanged v1 draft adds no annotations or schema upgrade. `updateWaAnnotations` is the only annotation-write boundary. The first user edit creates the required manual markers and explicitly opts that draft into v2. Each business-area entry is created only after an edit; its required strings/skills then satisfy the model schema.

Move-to-pool, member deletion and replacing Alpha call model helpers without cleanup first. `ANNOTATION_CLEANUP_REQUIRED` provides annotation objects. A shared confirmation lists affected edge names/endpoints, ally names and Powerbase annotations with counts. Cancel retains all assignments and records. Confirm retries the original edit with `confirmAnnotationCleanup:true`, provided generation, draft object identity and full captured draft content are unchanged. The helper retries against the captured original snapshot, including its original annotation arrays. Cross-group moves preserve participant annotations. The UI does not duplicate JSON/reference validation.

Deleting the whole consultation uses the existing explicit `downgradeWaSnapshot` copy operation and restores any manual edges through `updateWaAnnotations`. This modifies only the current draft. It does not downgrade IndexedDB or silently erase edges. Optional records are never assigned null.

Restoring a revision compares current annotation fields with that snapshot before writing. A differing older v1 revision explicitly says it contains no v2 consultation/links, lists affected current records, explains immutable saved history remains and unsaved edits will be replaced, and offers cancel. Restore continues through the repository's expected-revision CAS. Save/reload/restore retain complete model fields.

Export manual annotations downloads `exportWaAnnotations(draft)`. Export backup downloads the current draft plus `repository.exportOrganization` (saved head, all revisions and annotation sidecars). Both are explicit user-click downloads. The UI has no database rollback control; repository downgrade export remains the formal data API.

## Preparation and failure boundaries

`prepareWaMembers(snapshot,{getPerson,calculateBirth,effectiveBirth:effectiveTeamBirth})` consumes original PeopleStore records. All assigned person snapshots and the UI generation are retained around async work; stale provider results never overwrite edits. Null throws and invalid provider outputs map from stable issue codes to localizable user messages. No fallback API or partial plausible coverage is constructed.

Content list/read exceptions produce a scoped Wa-reading-unavailable message while keeping drafts and structural analysis independent. This is a guard around existing synchronous content reads, not a new source loader. Saved-list/history reads and their load/restore failures also check active operation, generation and disposal before displaying delayed errors.

## Verification

`node tests/wa-v2-ui-e2e.mjs` against 19981 passed with real view, model, prepare, analysis and IndexedDB, synthetic fictional chart inputs and identities:

- Textareas, multi-line typing, area/intent/link edits, stable IDs, same-direction contacts with distinct edge IDs, explicit record deletes and consultation removal preserving edges.
- v1 stays unannotated until edit; v2 save, remount/reload, warning/cancel on restore to v1, restore back to annotated history.
- Cross-group retention; pool/remove/replaced-Alpha cancel; stale cleanup confirmation rejected after a pending draft edit; confirmed deletion cleans only affected references including Powerbase notes.
- Explicit JSON downloads contain annotations and complete saved history.
- Group-only versus with-Alpha endpoint counts and scoped contributor detail; checkbox hides only Alpha scope; line-only trace with unchanged global counts.
- Null/invalid providers, stale person snapshots without subscription notifications, DB v1 client fence, CAS conflict retention and stale list/history failures after new organization navigation.
- 99 actual registered Skin × language × viewport checks (11 Skins × en/zh-CN/zh-Hant × 1440/390/320), plus 18 light/dark full-page screenshots under `artifacts/visual-review/wa-ui-v2/`.

The first v2 run exposed a real details-toggle re-render race; fixed by reading expansion state before replacing DOM and ignoring detached-node toggles. A subsequent trace assertion exposed the test harness importing another HMR module instance, splitting WeakMap provenance; the harness now uses the view's production analysis import. Neither assertion was weakened. Original failure transcripts remain in the session tool records.

The existing `tests/wa-ui-e2e.mjs` suite is unchanged and passed after prepare integration with real WASM, 18 responsive screenshots, save/list/history/restore/conflict and stale/person races. It also passed against final UI source `e6dfef4` plus B compatibility fix `9302bb0`. B's `tests/wa-v2-prepare-e2e.mjs` passed with real WASM for missing legacy time flags, optional runtime undefined fields and explicit unknown-time noon handling. The full v2 UI matrix passed on that same combined tree. The static build passed against source `3715854` using the existing engine output; no fresh .NET engine compilation is claimed. Build warnings remain for two baseline font.css references and the existing oversized application chunk; they were not altered in this task.

## Final integration follow-up

`df0b96c` (integrated as `81ae135`) preserves the native text-input DOM nodes, selection, undo history and Chinese composition session across title, group and manual-body edits. Text changes invalidate analysis immediately through a local refresh. Manual-edge editing tracks actual input so absent unedited label/note stay absent; explicit clearing remains an empty string and sourceRef survives. Eight input categories, no-op/endpoint-only edits, explicit clearing and new optional fields have targeted regression coverage.

The parent ran the final combined source on `http://127.0.0.1:9961/`: v2 main workflow including IME/optional-field assertions and all 99 Skin/language/viewport cases passed; the original real-WASM Wa UI suite also passed. The final static build and private-client bundle exclusion check passed, retaining the existing font/chunk warnings.

No main merge, deployment, external publishing or reference-engine copy was performed. Feature-branch delivery and final audit results are recorded in `PENTA-WA-V2-DELIVERY.md`.
