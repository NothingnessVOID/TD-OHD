# Wa v1 implementation contract (prepared during Penta integration)

This document defines stage 2 interfaces. It is not a claim that Wa code/UI exists. Implementation begins after stage 1 Penta delivery is reported.

## Persistence and existing Team compatibility

Existing `TeamRepository v2` remains `kind: penta` under `ohd-teams-v1`. Wa uses independent `wa-refs-v1` snapshots. Fields: organizationId, title, revision, revisionId, parentRevisionId, savedAt, layoutMode, alphaAssignment=manual, alphaId (nullable draft), members[{memberId,personId,labelSnapshot}], pentas[{pentaId,role,title,memberIds}], optional manualMetadata and customPolicy. No birth, chart, computed result, gate set, score or inferred role is persisted.

Reuse PeopleStore lookup/subscriptions, birthFromPerson, computeChart, createUuid, team member identity helpers, extractTeamActivations, Penta structure calculation, shared operation/details controls, i18n and Skin tokens. Existing private Team repository validators cannot be imported; Wa validators follow compatible reference semantics without changing Penta storage. Member pool may include unresolved birth input; only assigned participants require calculation readiness.

Draft shape validation is followed by cross-field identity validation. Unknown fields, duplicate identity/person, dangling assignment, duplicate role/group and cross-group duplicate assignments are rejected. A standard draft may be incomplete and still saved. Analysis readiness separately requires foundation/expansion/coordinating groups of 3–5 with a manually selected Alpha outside those groups. Observation supports nonstandard size without claiming mechanical formation; custom requires explicit reason and policy. Unassigned pool never contributes to analysis.

Repository API: list(), get(id), history(id), save(draft,{expectedRevision}), restore(id,revisionId,{expectedRevision}). Use an IndexedDB transaction to atomically compare head revision, append an immutable snapshot and update head. Restore creates a new revision; it never overwrites historical revisions. A conflict retains local edits. Person updates/deletion are resolved at render/analysis time, not by rewriting old snapshots. Restoring relations uses current people data and does not promise the historical calculated chart.

## Runtime analysis and future rule boundary

`analyzeWa(snapshot, preparedMembers)` receives runtime full charts, validates layout and all assigned inputs, then outputs stable participant IDs, pool IDs, group Penta outputs, six pair structures, holder contributions and a schematic layout. Existing Penta calculation is reused for valid 3–5 groups. Unready layouts/inputs do not produce plausible zero results. Async view integration uses generation and input snapshots to reject stale results.

Six canonical IDs: 21-45, 25-51, 2-14, 3-60, 6-59, 27-50. Content aliases preserve package IDs 45-21, 51-25 and 59-6. Display catalog labels belong to Wa, independently of ordinary channel names. Endpoint union and within-person/cross-member counts are structural observations, not confirmation of original Wa mechanics. Unknown-time charts remain estimated/conditional; interval certainty is unsupported until a verified provider is supplied.

Future strategies must expose supported capability/version metadata. Automatic Alpha, formal Gap, Triggering, automatic Powerbases, authority/fit/leadership scores and formation booleans are unsupported; absence must not be represented by 0, false, or fabricated conclusions. Manual metadata is explicitly user-authored.

## Page design

Independent Wa view linked from the application navigation. At desktop: organization title/mode/save-history controls; existing-person pool; Alpha selector and three assignment groups; simple SVG organizational schematic; six communication topics with contributor details and change comparison. At phone: the same controls in vertical flow, collapsible group sections, schematic plus readable lists. Alpha-to-group edges mean manual organization only; they do not stand in for six mechanical channels.

No automatic seeding or real-person test fixtures. Short status labels distinguish incomplete layout, missing data and ready structural analysis. Content details use the package's 14 localized articles through an independent Wa content reader and shared dialog lifecycle. Source/evidence detail is optional; ordinary user flow does not require reading developer audit metadata.

## Licensing and delivery

Reference engine has no explicit license in the provided package; do not copy it into production source. Implement the declared structural behavior with existing site primitives; retain the provided reference as input evidence. Supplied content is integrated under the user's explicit development instruction with source references and editorial limitations intact. No site deployment is authorized.
