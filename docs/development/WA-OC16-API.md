# OC16 preview API (stage 2)

Imports: `src/lib/wa/oc16-catalog.js` and `src/lib/wa/oc16-analysis.js`.

```js
const prepared = await prepareWaPreview(snapshot, { getPerson, calculateBirth, effectiveBirth });
const result = analyzeOC16(snapshot, prepared, { pentaId: null, includeAlpha: true });
// Also accepts prepared.members array. Cache preparation; change scope synchronously.
if (result.status === 'ready' || result.status === 'empty') {
  // result.departments, result.gateRecords, result.pairs, result.pillars
  // result.groups[i] and result.groups[i].withAlpha have the same coverage fields
}
```

`prepareWaPreview` validates the original snapshot before cloning it with temporary `layoutMode: 'observation'` and delegating to `prepareWaMembers`. No persisted mode changes. Returns `{status: 'ready'|'empty'|'not_ready', members, issues, layoutValidation, standardTemplateSatisfied}`. `layoutValidation` always describes the original snapshot. Empty assigned membership needs no providers. Pool is excluded from provider calls and coverage. UI continues to own async generation/person-change cancellation.

`analyzeOC16(snapshot, prepared = [], options = {})` returns `status: 'ready'|'empty'|'not_ready'`, `issues`, original `layoutValidation`, `standardTemplateSatisfied`, `memberIds`, `poolMemberIds`, `poolExcluded: true`, `alphaId`, organization/revision IDs. Ready includes 1 or 2 assigned people and groups outside the standard template. Template readiness is independent of coverage. Errors expose no coverage, departments, gateRecords, pairs, pillars, groups or partial Core WA result. Empty exposes genuine zero coverage with all 64 absent gates and 32 absent pairs. `options.pentaId` defaults to null (whole organization); an existing group ID selects that group. `options.includeAlpha` defaults to true and can exclude Alpha from either scope. Invalid options fail with `INVALID_OC16_SCOPE`. Root `memberIds` lists the selected scope; `assignedMemberIds` lists the original organization participants. Root `pentaId` and `includeAlpha` echo the resolved selection. All assigned members are validated even when the selected scope excludes them; missing inputs cannot produce partial success.

Successful results have these coverage fields (also on group scopes):

- `gateRecords`: all gates 1..64 in numeric order, each `{gate, memberIds, contributorIds, contributorCount, activationCount, holders, activations}`. Each activation preserves `{memberId, side: 'personality'|'design', planet, gate, line}` from the shared extractor.
- `pairs`: 32 pairs in department/display order; canonical `channelId` and ascending `gates`; `displayGates`, `departmentId`, `role: 'core'|'support'`; existing collectPair fields including `status: 'absent'|'hanging'|'selfComplete'|'crossMemberOnly'|'both'`, `missingGates`, `holdersByGate`, `gateRecords`, `selfCompleteMemberIds`, `complementaryMemberPairs`, `withinMember`, `acrossMembers`. `contributorIds` is added without changing collectPair semantics.
- `departments`: six catalog entries extended with their analyzed `pairs`, `gateRecords`, `gateCount`, `gateTotal`, `gatePercentage`, `pairCount`, `pairTotal`, `pairPercentage`, `contributorIds`. Gate count means distinct present gates; pair count means both endpoints present in the scoped union, including cross-member pairs. Percentages are unrounded 0..100.
- The same counts/percentages and `contributorIds` at scope root, with totals 64 and 32.
- `pillars`: ordered Structure 60, Safety 50, Interaction 6, Hierarchy 45. Catalog metadata plus the corresponding gate record and `present` boolean. No pillar scores.
- Root `scope` is `assigned_members`, `assigned_members_without_alpha`, `group_members_only`, or `group_union_manual_alpha` according to options. `groups`: `{pentaId, role, title, scope: 'group_members_only', memberIds, ...coverage, withAlpha: {scope: 'group_union_manual_alpha', memberIds, ...coverage}}`. Group membership remains disjoint; Alpha is included only in `withAlpha`, never pool.
- `coreWa`: unchanged `analyzeWa` result for the temporary observation snapshot, or `null` when the entire organization has no assigned members. An empty selected group can still have a ready organization-level `coreWa`. `pentas`: existing Core WA group outputs; a Penta result exists only for 3..5 members, otherwise `result: null`. Root `layoutValidation` is the authoritative original-layout diagnostic, not `coreWa.layoutValidation`.

`scopeOC16(result, memberIds)` returns a fresh coverage view (`scope: 'selected_members'`) for a unique subset of original organization assigned stable member IDs (even if the root currently selects a smaller group), with ready/empty status. Invalid, duplicate, unknown or pool IDs and unready source results return `not_ready` without coverage. Scopes are rebuilt from preserved activation provenance, not from union gate presence.

Catalog exports:

- `OC16_DEPARTMENTS`: frozen array, order management, competition, direction, interaction, logic, innovation. Each `{id, nameKey: 'OC16 <id>', displayPairs, pairs}`; displayPairs are ordered endpoint tuples. Each pair `{channelId, gates, displayGates, departmentId, role}`. First pair of each department is core, remaining pairs support.
- `WA_PILLARS`: frozen array of `{id, nameKey: 'OC16 <id>', gate}` with IDs structure, safety, interaction, hierarchy.

All coverage exposes `classification: 'user-supplied-reference-classification'`, `sourceScope: 'supplied_chart_activations'`, `officialMechanics: false`, `structuralStatisticsOnly: true`, `powerbaseInference: false`. The mapping is the user's reference classification, not researched or verified mechanics. Core WA remains a separate `coreWa` result; no scores, rankings, formation claims or formal Powerbase inference are computed. Optional manual annotations do not change coverage.
