# Wa core v1

Implemented on base `f278e419e605e65d6f7ec501857bdc896103e2fa`, independently of the UI/content workstreams. Scope: refs-only model, runtime structural observations, stable comparison, and IndexedDB revision storage. No package.json, navigation, messages, existing Team storage, or Penta algorithm changes.

## Public model API

`src/lib/wa/model.js` exports:

- `createWaDraft({organizationId?, title?} = {})`: new standard draft with secure UUID organization/group IDs, empty member pool, three empty role groups and null Alpha.
- `createWaMember({personId, labelSnapshot, memberId?})`: creates a refs-only member through the existing Team identity helper. Save a person to PeopleStore first; birth data is not required here.
- `validateWaSnapshot(snapshot)`: `{valid, status: 'valid'|'invalid', issues:[{code,path,message}]}`. Real Ajv 2020 + ajv-formats validates closed shapes before reference/identity semantics. Inputs are not sanitized, coerced or mutated; unknown fields fail.
- `assertWaSnapshot(snapshot)`: returns the input on success, otherwise throws `WaModelError` with `code: 'INVALID_SNAPSHOT'` and `.issues`.
- `validateWaLayout(snapshot)`: adds `ready`, `standardTemplateSatisfied`, sorted `memberIds`, sorted `poolMemberIds`, and groups `{pentaId,role,memberCount,ready}`. Invalid snapshots have no participants.
- `moveWaMember(snapshot,memberId,target)`: returns a new snapshot. Target is `{pentaId}`, `{alpha:true}`, or `null` (pool). Removes the previous assignment atomically. Replacing Alpha returns the previous Alpha to the pool; no inferred selection.
- `removeWaMember(snapshot,memberId)`: returns a new snapshot with member/group/Alpha/manual power-base references removed. Removing Alpha leaves a draft; it never chooses a replacement.

Factory snapshot shape:

```js
{
  kind: 'wa', schema: 'wa-refs-v1', organizationId, title: '',
  revision: 0, revisionId: null, parentRevisionId: null, savedAt: null,
  layoutMode: 'standard', alphaAssignment: 'manual', alphaId: null,
  members: [{memberId, personId, labelSnapshot}],
  pentas: [{pentaId, role, title: '', memberIds: []}]
}
```

All displayed fields are data, not HTML. `role` is foundation, expansion or coordinating. Optional `manualMetadata` contains `notes` and `powerBases:[{memberId,label,assignment:'manual',note?,sourceRef?}]`. Source refs are user-authored text and never downloaded. `customPolicy` is a reserved closed shape; this release rejects it and `layoutMode:'custom'` with `CUSTOM_UNSUPPORTED`. v1 supports standard and observation only.

Persisted revisions start at 1 with a nonempty revisionId and an ISO date-time savedAt. Revision 0 is the unsaved draft and requires null revision metadata. Snapshots never persist birth, chart, gate sets, calculated results, scores or inferred roles. `personId` is mandatory and unique; deleted people remain as references, resolved by the UI at runtime. Label snapshots do not become identity keys.

Shape-valid incomplete standard drafts can save. Standard analysis requires three distinct role groups with 3–5 members each, a manually selected Alpha outside all groups, and 10–16 total assigned participants. Pool size is unlimited and irrelevant to readiness. Duplicate member/person/group/role identities, dangling assignments, cross-group overlap and Alpha/group overlap fail in every mode. Observation permits nonstandard size, but is explicitly `outside_standard_template`; no formation claim is made. Empty observation has no analyzable participants and returns `not_ready`.

## Runtime analysis

`src/lib/wa/analysis.js` exports `analyzeWa(snapshot, preparedMembers = [])`, `diffWa(previous,next)`, `WA_PAIRS` and `WA_CAPABILITIES`.

Prepared members are an array of runtime objects:

```js
{memberId, chart, timeUnknown?, birthTimeConfidence?, chartQuality?: {mode}}
```

`chart` must have personality and design sides containing exactly the 13 existing Sharp planet keys. Each entry has integer gate 1–64, line 1–6 and, if supplied, a matching planet key. Existing `extractTeamActivations` validates all 26 entries. Full Sharp extra chart/activation fields are allowed. `gates.all`, supplied channels and pool charts never override planetary provenance. Missing or invalid assigned data blocks the complete analysis, with no partial/zero coverage result. Pool data is not inspected or required.

`status` is `layout_not_ready`, `not_ready` or `ready`. All results have `modelVersion`, organization/revision identity, `capabilities`, `layoutValidation` and `issues`. Only ready results expose `members`, `pentas`, `communication`, `uncertainty`, `layout` and `alphaId`.

- `memberIds` and `poolMemberIds` are sorted stable IDs.
- `members[]` includes refs, gateIds, all-36-catalog `activeChannelIds`, gateContributions with activationCount, total activationCount, contributing pairIds and selfCompletePairIds. Individual complete channels never borrow another member's endpoints.
- `pentas[]` includes `{pentaId,role,title,memberIds,status,result}`. Groups with 3–5 participants directly call existing `analyzePentaStructure`. Its four-state contract is preserved unchanged, including one-endpoint channels reported as absent. Observation groups outside 3–5 expose `status:'outside_standard_template'` and `result:null`.
- `communication.pairs[]` uses canonical channelIds `21-45`, `25-51`, `2-14`, `3-60`, `6-59`, `27-50`. Each contains gates, five-state status, missingGates, holdersByGate, gateRecords, selfCompleteMemberIds, complementaryMemberPairs, withinMember/acrossMembers, activationCount and contributorCount. Complementary pairs explicitly identify `{firstMemberId,secondMemberId}` corresponding to the ordered gates. gateRecords expose each gate's memberIds, activationCount, contributorCount, per-holder counts and all activation provenance.
- Pair states: absent means both endpoints absent; hanging means one absent; selfComplete means a holder has both without cross-member pairing; crossMemberOnly means only distinct members complete the pair; both means self and cross contributions coexist. Repeated planetary activations count separately, contributors count unique people.
- `communication.missingGateIds` and `incompletePairIds` are structural absences, never formal Gap judgements. Labels, content aliases (`45-21`, `51-25`, `59-6`) and research display provenance are the independent Wa content layer's responsibility; no ordinary channel labels are reused here.
- `uncertainty.certaintyMode` is always `single_chart_conditional`. timeUnknown or estimated confidence adds estimatedMemberIds. Estimated, unknown, not_recorded, omitted confidence, or timeUnknown adds uncertainMemberIds. Full activations do not establish exact birth time. Explicit exact with no timeUnknown clears the uncertain flag, but still makes no interval claim. `chartQuality.mode:'interval'` yields `DATA_QUALITY_REQUIRED` and no calculations; unsupported mode values also fail.
- Capabilities contain `{supported,version? ,reason?}`. Automatic Alpha, formal Gap, Triggering, automatic Power Bases, interval certainty, authority/fit/leadership scores, rankings and formation are explicitly unsupported. No fabricated numbers/booleans stand in for these unavailable conclusions.

The schematic returns `{version:'schematic-v1',relationshipMeaning:'manual_organization_only',viewBox,nodes,edges}`. Nodes have stable encoded nodeId, kind, x/y and memberId or pentaId. Edges use `{edgeId,from,to,kind}` and represent membership/manual coordination only. Six communication themes are separate from the three Alpha-to-group edges. Reordering preserves the schematic; adding/removing participants can move ring coordinates while keys remain stable. Use normal DOM/text assignment even for encoded identifiers.

`diffWa` requires two ready results from the same organization. It returns stable participant additions/removals, pool delta, Alpha change, reassignments `{memberId,from,to}`, changed pentas and `communication.pairs:[{channelId,from,to}]`. Placement is null, `{kind:'alpha'}`, `{kind:'pool'}` or `{kind:'penta',pentaId}`. Group diffs include role/member/readiness/result changes. Moving between groups can change group results with an unchanged communication union. `memberChanges:[{memberId,before,after,gateIds:{added,removed},activeChannelIds:{added,removed}}]` includes individual gate/count/channel changes even outside Penta/Wa endpoints; before/after contain the member's derived structure, excluding display labels. Reordering/renaming alone produces no structural changes. Errors return status not_ready or invalid with issues.

## IndexedDB repository

`src/lib/wa/repository.js` exports:

```js
createWaRepository({indexedDB?, databaseName?, uuid?, now?} = {})
// => { list, get, history, save, restore }; all operations async
listWaOrganizations()
getWaOrganization(organizationId)
listWaRevisions(organizationId)
saveWaOrganization(snapshot, {expectedRevision})
restoreWaRevision(organizationId, revisionId, {expectedRevision})
```

Named functions use the default factory. Factories default to the same independent database `ohd-wa-refs-v1`, version 1; no existing Team/localStorage key is accessed. `databaseName` allows isolated tests. Each operation opens a connection and closes after commit/rollback; no shared open connection leaks across tests. `uuid` and `now` are injectable for deterministic failure tests.

`list()` returns complete current snapshots ordered by savedAt descending and organizationId. `get(id)` returns snapshot or null. `history(id)` returns full immutable snapshots in descending revision order (empty for missing organization). `save`/`restore` return the newly committed snapshot. Save captures a structured clone before the first await. Save with expectedRevision 0 creates revision 1; subsequent saves require the loaded revision and revision identity. Missing expectedRevision throws `EXPECTED_REVISION_REQUIRED`. Stale writers throw `REVISION_CONFLICT` with expectedRevision, actualRevision, and the current snapshot when read. Input edits remain untouched.

A single readwrite transaction reads the actual head, checks CAS, `add`s an immutable revision, and `put`s the new head. Revision identity or unique revision-number collisions abort the entire transaction. Return occurs only after transaction completion. Restore reads the chosen historical snapshot within that transaction, then creates a new revision pointing to the current head as parent. The old history is never overwritten. No separate restored-from field is persisted. Restore reconstructs relationships only; the UI must resolve current PeopleStore records and recalculate current charts, not promise historical chart reproduction.

Validation errors retain `WaModelError`/issues. Storage errors use `WaRepositoryError` with a code including STORAGE_UNAVAILABLE, STORAGE_OPEN_FAILED, STORAGE_BLOCKED or STORAGE_TRANSACTION_FAILED. No localStorage fallback silently discards atomicity. Existing Team's private groupsFor validator is not imported or claimed as reused.

## Licensing, dependency and validation evidence

The package DEVELOPMENT.md, model.schema.json and engine/catalog.mjs were read as requirements/catalog evidence. The unlicensed reference engine implementation was not read or copied. The Wa union, diff, schematic and transaction implementation are original. Existing site primitives reused: createUuid, createMember, extractTeamActivations, analyzePentaStructure and the site's complete CHANNELS catalog. No automatic mechanical conclusions are inferred.

The parent integration owns direct dependencies Ajv 8.20.0 and ajv-formats 3.0.1 (parent commit 8969a4e); this worktree used the existing node_modules junction and did not modify package.json or lockfiles.

Validation commands:

```sh
node --test tests/wa-model.test.js tests/wa-analysis.test.js tests/wa-repository.test.js
node tests/wa-repository-e2e.mjs
node --test tests/team-activation.test.js tests/team-members-phase1b.test.js tests/team-repository-v2.test.js tests/penta-catalog.test.js tests/penta-structure.test.js
```

The 17 Wa unit tests use synthetic IDs and full synthetic activations. Coverage includes closed schemas/date formats, invalid refs/duplicates, incomplete draft saving, 10/16 and 9/17 layouts, pool exclusion, all five statuses, provenance counts, all 26 entries, conditional/omitted time confidence, interval rejection, Penta output compatibility, stable reordering, reassignment and individual diffs. Real Chromium tests start a private Vite server and isolated browser context without using production data. They exercise save/get/list/history/restore, stale CAS, two independent tabs racing with exactly one winner, immutable revision collisions rolling back head/history, page-reload persistence, refs-only records, and preservation of the existing Team storage key. Node tests cover admission/errors; they do not substitute a synchronous fake for IndexedDB atomicity.

No push, main modification or deployment is part of this workstream. Parent integration owns source guards and full UI/build validation.
