# Wa v2 reference storage compatibility

Base: c379fbe. This increment owns reference shape, admission, runtime preparation and IndexedDB; it adds no analysis algorithm, coverage rule, scores, inferred allies or Alpha selection. Birth engine and team helpers are unchanged. Existing Ajv, ajv-formats, Vite and Playwright dependencies are reused.

## Schema decision

- `WA_SCHEMA = 'wa-refs-v1'` remains the default. Existing valid v1 drafts, heads and histories are read, edited, saved and restored with no injected annotations or schema migration.
- `WA_ANNOTATED_SCHEMA = 'wa-refs-v2'` identifies snapshots containing at least one own `manualCommunicationEdges` or `consultation` property. Empty explicit arrays/manual consultation drafts count as fields. V1 explicitly rejects both properties; v2 requires at least one.
- `updateWaAnnotations(snapshot, patch)` accepts only these two keys, deep-copies the patch and chooses the marker at this explicit edit boundary. Save/load never silently fixes a mismatched marker.
- Members remain strictly `{memberId, personId, labelSnapshot}`. Birth/chart/prepared results must never enter storage. Both schema versions reject unknown fields, non-JSON values, cyclic/unsafe objects, accessors, hidden properties, sparse arrays, nonfinite numbers and class instances before Ajv. JSON admission is iterative and caps nesting at 100.
- Persisted `savedAt` requires a real timezone-bearing date-time. Invalid old timestamps are rejected unchanged; there is no invented historical timezone. A repair workflow must preserve the old evidence separately and explicitly supply a new save time.
- Custom layouts remain unsupported as in the website v1 contract.

## Optional annotation shapes

```js
const patch = {
  manualCommunicationEdges: [{
    edgeId: 'stable-edge-id', fromMemberId: 'member-a', toMemberId: 'member-b',
    assignment: 'manual', label: '', note: '', sourceRef: ''
  }],
  consultation: {
    assignment: 'manual', origin: 'manual', specificProblem: '',
    personalManagementNotes: '', communicationPlan: '', keyAllyIds: ['member-a'],
    businessAreas: [{ pentaId: 'existing-group', workScope: '', demand: '', requiredSkills: [] }],
    gapIntents: [{ id: 'stable-intent-id', pentaId: 'existing-group', theme: '', stage: 'wish_list', note: '', sourceRef: '' }]
  }
};
```

Only edge identity/endpoints/assignment and consultation assignment/origin are mandatory at their respective roots. Business area and gap item required properties follow the delivery schema. Text fields and skill lists allow empty drafts. Gap stages are `wish_list`, `configured`, `observed`, all human reports. No unknown attributes, duplicate edge IDs, self-links, pool endpoints/allies, duplicate allies, duplicate business Penta refs, duplicate gap IDs or unknown Penta refs. Distinct edge IDs may share directed endpoints for different purposes; reverse directed links are also distinct. Source refs are unverified text.

`validateWaSnapshot` returns schema/semantic issues. `validateWaLayout` now always supplies `canAnalyze`, `participantCount`, `standardTemplateSatisfied`, `memberIds`, `poolMemberIds`, `groups`, including invalid early returns.

## Runtime preparation contract for UI

```js
import { prepareWaMembers } from '../../lib/wa/prepare.js';
// UI may pass its existing effectiveTeamBirth helper; no lib -> view import.
const prepared = await prepareWaMembers(snapshot, {
  getPerson: id => people.get(id),
  calculateBirth: calculate,
  effectiveBirth: effectiveTeamBirth
});
// { status: 'ready' | 'layout_not_ready' | 'not_ready', members, issues, layoutValidation }
// ready members feed analyzeWa(snapshot, prepared.members).
```

The positional `(snapshot, getPerson, calculateBirth)` form is also supported. `getPerson` returns the raw PeopleStore person, including matching `id`, raw `timeUnknown`, birth date/time and numeric `timezone` or `location.timezone`. Do not call `birthFromPerson` before validation: it coerces flags and supplies missing time/offset defaults.

Snapshot refs and all participant births are checked before any chart provider call. Pool members are excluded. An omitted legacy `timeUnknown` means false; an explicitly supplied flag must be an actual boolean (null/string/undefined are rejected). Dates are real Gregorian dates, time HH:MM and offsets finite numbers from -14 through +14. Missing time is allowed only for explicit unknown time. The sole existing estimate is noon for `timeUnknown:true`; an injected `effectiveBirth` cannot alter validated date, timezone or flag. Adapter application occurs only after raw checks. Provider receives a copy. Null/string/Error throws all become `CHART_CALCULATION_FAILED`; missing/broken full Sharp activations become `INVALID_PROVIDER_RESULT`. Runtime person/chart objects are not storage JSON: unrelated optional undefined fields are accepted, while consumed chart/gates/sides/activations must be plain records and pass the complete Sharp activation contract. Cloneable optional chart metadata, including cycles outside consumed paths, is preserved only in runtime output. A failed batch returns no partial members. UI continues to own generation cancellation and PeopleStore-change checks; this helper does not authorize accepting stale results.

## Explicit reference cleanup

```js
moveWaMember(snapshot, memberId, target); // default: never drop annotations
removeWaMember(snapshot, memberId);
// Catch error.code === 'ANNOTATION_CLEANUP_REQUIRED'.
// error.issues lists exact paths and deep-copied annotation entries to show in a confirmation.
moveWaMember(snapshot, memberId, target, { confirmAnnotationCleanup: true });
removeWaMember(snapshot, memberId, { confirmAnnotationCleanup: true });
reconcileWaAnnotations(editedSnapshot, { confirmAnnotationCleanup: true });
```

Moving between groups retains participant annotations. Moving to pool, replacing Alpha (which puts the previous Alpha in the pool), removing a member or removing referenced Pentas requires explicit cleanup of affected annotations. Removing a member also requires confirmation for its manualMetadata.powerBases records, replacing the old automatic deletion behavior. Error issue codes include `MANUAL_EDGE_ENDPOINT_NOT_PARTICIPANT`, `ALLY_NOT_PARTICIPANT`, `CONSULTATION_UNKNOWN_PENTA`, `UNKNOWN_METADATA_MEMBER`. `annotation`, `path` and `message` identify each affected entry. Structural validation failures are not cleaned up. Helpers never mutate the input. The boolean cleanup flag is not an impact token. Caller must bind confirmation to the captured draft and generation, retry against that exact snapshot, and invalidate/recalculate the confirmation if any mutation or generation change occurs; never apply an old confirmation to a different draft.

## IndexedDB v2 fence and cross-tab behavior

Database name remains `ohd-wa-refs-v1`; version becomes 2. Stores, keys, indexes and payloads are unchanged. Upgrade creates stores only if missing and performs no cursor migration, reserialization or rewriting of old head/history. History remains append-only (`add`) and restore appends a revision with current head parent. CAS and revision identity checks remain in the readwrite transaction.

An old client that opens explicit version 1 receives native `VersionError`, which its old repository surfaces as `STORAGE_OPEN_FAILED`; it cannot unknowingly overwrite annotated records. This is a database-wide fence, even if an organization is still v1. Existing old connections receive versionchange and the old repository closes them. A stubborn old connection yields `STORAGE_BLOCKED`; tell users to close/reload old Wa tabs and retry explicitly. Once an open has rejected as blocked, any later upgradeneeded aborts the upgrade transaction so a failed attempt cannot upgrade silently after the blocking tab closes.

## Backup and intentional downgrade

- `exportWaAnnotations(snapshot)` returns deep-copied optional annotations linked by organizationId, revision, revisionId, parentRevisionId and savedAt.
- `downgradeWaSnapshot(snapshot, {confirmAnnotationRemoval:true})` returns `{snapshot, annotations}`. The v1 copy explicitly omits optional fields; the sidecar preserves them. Without true confirmation an annotated input throws `ANNOTATION_DOWNGRADE_CONFIRMATION_REQUIRED`.
- `repo.exportOrganization(id)` / `exportWaOrganization(id)` captures one consistent readonly transaction containing full head, all history, and annotation sidecars for head plus every revision, including annotations present only in historical revisions.
- `repo.exportV1Organization(id, {confirmAnnotationRemoval:true})` / `exportWaV1Organization` converts the full export to v1-shaped copies and preserves the complete sidecars. If even one historical revision has annotations, omitted confirmation throws. Export never mutates storage.

**A v1-shaped export does not make the old application usable against the upgraded database.** IndexedDB cannot downgrade the live version to 1, and these APIs never delete/recreate the live database. Returning to an old application requires a separate reviewed import/restore workflow into an appropriate backup environment. This phase provides export artifacts, not an old-client importer. Keep the complete v2 backup, sidecars, and immutable live history. Never silently strip annotations or suggest clearing browser data as rollback.

## Verification

`node --test tests/wa-model.test.js tests/wa-v2-model.test.js tests/wa-repository.test.js tests/wa-analysis.test.js` covers v1 preservation, strict JSON/provider boundaries, annotation semantics, cleanup and downgrade. Only the old powerBase auto-cleanup expectation changes, now with an assertion that default removal is rejected and explicit confirmation succeeds.

`node tests/wa-repository-e2e.mjs` uses real headless Chromium IndexedDB with isolated synthetic databases. It covers seeded legacy v1 head/history loading, v1 edit/save, v2 annotation save/edit/restore, restore of legacy history, immutable old snapshots, full-history export, explicit downgrade, old-client VersionError fence, versionchange close, blocked-upgrade abort and explicit retry, in addition to existing simultaneous-tab CAS, revision collision rollback and page reload persistence. No real people or production database is touched.
