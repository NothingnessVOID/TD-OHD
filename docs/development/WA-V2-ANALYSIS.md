# Wa v2 website analysis increment (C)

This is an original extension of the existing website `src/lib/wa/analysis.js`, based on website commit `c379fbe6b9a1b4b472b900aeedc691275407c3f8`. The development package's `changes/engine-v2.json` and `wa/DEVELOPMENT.md` supply semantic requirements only. No reference-engine implementation is imported or copied. The Penta structure, Penta catalog, and team activation algorithms are unchanged.

## Compatibility and admission

The website API retains `analyzeWa(snapshot, preparedMembers)`; prepared full Sharp charts remain runtime-only and separate from references-only snapshots. Legal default analysis results and default `diffWa` results are compared with the original c379 website source using exact deep equality, including own-key checks. `modelVersion` and `WA_CAPABILITIES` remain unchanged. New optional outputs are never inserted as null/default placeholders.

B owns schema and semantic admission: `validateWaLayout` invokes strict `validateWaSnapshot` before analysis. Website snapshots without annotations keep `wa-refs-v1`; snapshots with `consultation` or `manualCommunicationEdges` explicitly use B's `wa-refs-v2` admission schema. This website safety boundary differs from the external package's storage schema name. C does not repeat the manual-field validator. Invalid layout returns retain B's stable `canAnalyze:false`, `participantCount:0`, `standardTemplateSatisfied:false`, and empty `memberIds`, `poolMemberIds`, `groups`. For successful analysis, C excludes the two new layout diagnostics (`canAnalyze`, `participantCount`) from nested `layoutValidation` to retain the exact v1 result shape. Call `validateWaLayout` separately for those new diagnostics.

Incomplete standard layouts return `layout_not_ready`; missing/bad runtime charts return `not_ready`. Neither result has computed coverage or opt-in group results. An observation with no participants is `not_ready` with `NO_PARTICIPANTS`. Valid observation participants can be ready even if an individual group is empty. That group has `pentas[].result:null`, `status:outside_standard_template`, never a formation claim.

Malformed prepared containers and null/string/invalid-ID entries produce structured issues rather than TypeError. Duplicate prepared IDs are rejected before extracting charts, including duplicate pool IDs. Single valid pool entries are identity-checked, but their charts and quality are never inspected or included in coverage. Participant `chartQuality` must be an object if supplied; interval and unrecognized modes remain unavailable. `unknown`, `not_recorded`, and absent birth confidence remain uncertain; only estimated confidence or `timeUnknown:true` adds an estimated marker. No time is invented.

## Group communication (opt-in)

```js
const result = analyzeWa(snapshot, preparedMembers, {
  includeGroupCommunication: true
});
```

Only `true` enables the additional `groupCommunication` property. Its shape is:

```js
{
  sourceScope: 'supplied_chart_activations',
  officialMechanics: false,
  groups: [{
    pentaId,
    scope: 'group_members_only',
    memberIds,
    pairs,
    withAlpha: {
      scope: 'group_union_manual_alpha',
      memberIds,
      pairs
    }
  }]
}
```

`pairs` uses the existing full six-pair record shape: `channelId`, `gates`, `status`, `missingGates`, `holdersByGate`, `gateRecords` (original member/side/planet/gate/line activations and counts), `selfCompleteMemberIds`, `complementaryMemberPairs`, `withinMember`, `acrossMembers`, `activationCount`, `contributorCount`, and `derivation:internal_activation_union_topology_v1`.

The six canonical IDs remain `21-45`, `25-51`, `2-14`, `3-60`, `6-59`, `27-50`. Group and member ordering is deterministic. Group-only coverage excludes Alpha; `withAlpha` explicitly unions group IDs with the manually assigned Alpha and deduplicates IDs. Current admission still prohibits Alpha/group overlap and unsupported custom layouts. The aggregation is generic and tested through an isolated validation seam so future overlap support cannot accidentally double-count. Pool charts never enter either view.

An empty group returns six structurally absent pair records; its `withAlpha` view may contain Alpha's contribution. This has no bearing on Penta formation or official Wa mechanics. `communication`, `pentas`, and schematic layout are unchanged by enabling this option.

## Manual outputs (only when supplied)

When an admitted snapshot owns `consultation`, ready output includes a deep clone at `result.consultation`. No defaults or computed consultation content are added. The manual assignment/origin and draft human intent stages remain as supplied.

When an admitted snapshot owns `manualCommunicationEdges`, ready output includes:

```js
manualCommunication: {
  assignment: 'manual',
  affectsCoverage: false,
  sourceVerification: 'not_performed',
  mechanicalActivation: false,
  edges: /* deep clone of snapshot.manualCommunicationEdges */
}
```

An explicitly supplied empty array remains `edges:[]`; omission yields no output property. Manual edges are separate from computed six-pair communication and from schematic Alpha/group membership edges. `sourceRef` remains unverified human text. Consultation and edges affect neither computed global/group/Penta coverage, Alpha selection, ranking, nor the default diff. Consumers can render those manual objects directly from a not-ready draft; no successful analysis is required to edit them.

Power Base data remains manual snapshot metadata. This increment emits no inferred composition, Power Base score, fit, ranking, or fabricated zero. `capabilities.automaticPowerBases.supported` remains false. A UI needing an absent composition value must use an explicit `not_provided` state or null, never zero. Do not infer verification from a user-entered source label.

## Contribution trace (opt-in)

```js
const previous = analyzeWa(previousSnapshot, previousPrepared);
const next = analyzeWa(nextSnapshot, nextPrepared);
const change = diffWa(previous, next, { includeTrace: true });
```

Only `true` adds `change.contributionTrace`. All existing diff properties remain byte-shape compatible with v1. Same-organization ready-result requirements still apply. A ready trace has:

```js
{
  status: 'ready',
  sourceScope: 'supplied_chart_activations',
  officialMechanics: false,
  meaning: 'member_and_input_changes_only',
  performanceCausality: false,
  activations: { added, removed },
  gates: [{
    gate,
    contributors: { added, removed }, // member IDs
    activationCount: { from, to, delta },
    contributorCount: { from, to, delta },
    presence: { from: 'present' /* or absent */, to: 'present' /* or absent */ },
    members: [{
      memberId,
      activationCount: { from, to, delta },
      presence: { from, to },
      added, removed // original activation records for this member and gate
    }]
  }],
  pairEndpoints: [{
    channelId,
    status: { from, to },
    endpoints: [{
      gate,
      holders: { added, removed },
      activationCount: { from, to },
      presence: { from, to }
    }]
  }]
}
```

Each activation record is `{memberId,side,planet,gate,line}`. Identity includes all five fields, encoded as a tuple, so a line-only edit removes the previous record and adds the new record even when counts and coverage are unchanged. Gates include changed provenance across **all 64 gates**, not only the six Wa pairs. Gate-level contributors count distinct people, while activation counts retain all original chart positions. `pairEndpoints` reports both endpoints for each affected catalog pair, including unchanged endpoint context.

Moving a participant between groups without changing chart inputs produces reassignments and possibly Penta/group differences, but no global activation additions/removals. Entering/leaving the participant union produces input-set changes. These are not claims about behavior, team success, interpersonal quality, or performance causality.

### Runtime provenance lifetime

For exact legal v1 output parity, full activation provenance is kept in a private WeakMap keyed by the original analysis result. It holds only copied activation records, no raw births. It adds no enumerable/nonenumerable/symbol properties to default results, and records can be reclaimed with the result.

**UI integration must retain the original `analyzeWa` result objects for trace comparisons.** A spread copy, structured clone, JSON round-trip, or a result from another module instance cannot carry full provenance (old results omit non-Wa gate source positions). In that case trace explicitly returns:

```js
{
  status: 'not_available',
  reason: 'ANALYZE_RESULTS_REQUIRED',
  sourceScope: 'supplied_chart_activations',
  officialMechanics: false,
  meaning: 'member_and_input_changes_only',
  performanceCausality: false
}
```

No partial trace is presented as complete. Re-analyze both saved snapshots with their prepared charts to recover a full trace. Treat analysis results as immutable; UI labels, selections, and annotations belong in separate view state. Trace and manual output mutation cannot modify original inputs or the private provenance cache.

## Verification

Run after B's model/schema commit is present:

```sh
node --test tests/wa-analysis.test.js tests/wa-v2-analysis.test.js tests/wa-model.test.js tests/wa-v2-model.test.js tests/wa-repository.test.js tests/team-activation.test.js tests/penta-structure.test.js
```

`tests/wa-v2-analysis.test.js` reads the c379 website model, schema, and analysis source from git, then evaluates the original modules in memory for exact default parity. It does not read the development package engine. Git baseline availability is required, and absence fails rather than silently skipping. Penta and activation implementation source is checked byte-for-byte after newline normalization.

Coverage includes invalid layout shape, malformed prepared data, duplicate pool identities, unknown confidence, opt-in scopes, pool exclusion, generic Alpha deduplication, empty observation groups, manual clone/no-coverage effects, exact line/planet/side trace, all-gate provenance, endpoint presence/count transitions, removal, source reorder determinism, group move semantics, and frozen-input protection.

Verified locally with B commits `10234da` and `26307b4` cherry-picked as `6deb049` and `631e6c3`: the command above passes **50/50**, with no skipped tests. `git diff --check` also passes. The C commit contains only its three owned files; parent integration should apply C after its existing B commits without replaying the cherry-picked copies.

B owns model/schema/revision/provider validation. C owns this analysis module, its new tests, and this document. UI integration remains with the parent/UI stage. Commit C independently after B; do not mix source-content A changes into it. No production deployment or main push is part of this increment.
