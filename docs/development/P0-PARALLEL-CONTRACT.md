# P0 parallel implementation contract

Status: user authorized implementation on 2026-10-10. Research continues separately and does not block A/B/C. No merge to `main`, PR publication, or production deployment is authorized by this document.

## Branches and ownership

All three feature worktrees start at `1d41435`.

| Task | Branch | Owns | Test server |
| --- | --- | --- | --- |
| A: people editing and consistency | `feature/p0-people-editor` | `main.js`, people/profile/local stores, placesearch, chart data/cache/input, entry/connection/transits/timeline refresh, new A components/tests | loopback 19961 |
| B: Team/Penta workspace | `feature/p0-team-workspace` | `team.js`, `penta-matrix.js`, Team/Penta layout styles, B input helpers/messages/tests | loopback 19962 |
| C: shared object details | `feature/p0-shared-details` | `chart.js`, `reference.js`, reference-content, gate-lenses, detail-dialog, shared detail modules/messages/tests | loopback 19963 |
| Coordinator | development/integration worktree | Vite, package metadata, cross-module wiring, LAN support, final integration/regression | shared preview 9961; isolated integration port if needed |

Use separate `node_modules` and build outputs in each worktree. Do not edit another task's worktree. Authorized implementation tasks start in fresh write-capable instances; a historical read-only research instance must not be repurposed without a valid execution context.

Feature owners commit their intended changes locally, report test evidence, and do not push or merge on their own. The coordinator reviews, pushes the named development branches, integrates, validates and then updates the shared preview. Preserve failures and do not rewrite frozen historical audit manifests to make checks pass.

## People API (A)

Keep the existing synchronous public entry points and return shapes: `listPeople`, `getPerson`, `savePerson`, `deletePerson`, `birthFromPerson`, `onPeopleChange`.

The callback may receive a backward-compatible payload:

```js
{
  type: 'save' | 'delete' | 'external',
  personId: string | null,
  before: Profile | null,
  after: Profile | null,
  calculationChanged: boolean,
  presentationChanged: boolean
}
```

Callbacks that ignore arguments continue to work. External/profile changes and deletion must invalidate affected view bindings. Preserve person ID and creation time. Data persistence failure must leave the editor open and must not leave a queued operation that silently saves later.

Numeric chart caches are keyed by actual computation inputs and engine identity. Changes to presentation metadata must update labels without requiring spurious numeric recomputation. Old asynchronous work must not overwrite a newer selection/edit or delete a newer pending cache entry.

## Unknown birth time (A + B + C)

Use 12:00 as effective computation time when `timeUnknown` is true; retain that flag. Do not save the approximation as if it were a known time. Validate normalized input and retain strict P/D activation completeness.

B owns Team acceptance of estimated time and supplies display metadata:

```js
{ memberId, personId, displayName, timeUnknown, estimatedTime: '12:00' | null }
```

Overview, contributor data and detail views show a concise estimate indicator. An unchanged numeric result does not justify retaining stale uncertainty metadata. Original exact-time rejection tests must be updated as an explicit contract change, not silently skipped.

## Penta detail adapter (B + C)

B preserves `createPentaMatrix(container, options)` and supports optional `analysisContainer` (default container) and `detailAdapter` (default null, standalone fallback).

C exports `pentaDetailAdapter` from `src/lib/shared-object-details.js`:

```js
{
  gate(gateRecord, ctx): string,       // HTML body
  channel(channelRecord, ctx): string,
  knowledge(objectId, ctx): string,
  bind(root, ctx): (() => void) | undefined
}
// ctx:
{ result, people, groupLabel, onGateSelect, onChannelSelect }
```

Callbacks receive a gate number or channel ID. B owns mounting/disposal, navigation and graph-to-reader interaction. C owns explicit-context content and lens bindings, reusing ordinary chart/library prose without consulting the global current person for Penta activations. Coordinator wires the adapter after merging branches.

C should provide a compatible `clearCurrentChart()` export to clear its private current chart/detail state; the coordinator connects this to A's deletion/no-current-person path. Existing chart and dialog exports remain compatible.

## Content and UI boundaries

- Preserve TeamRepository v2, stable relation IDs, multiple groups and existing one-group-per-member rules.
- Team pool has no eight-person cap; one Penta analysis contains 3–5 people.
- Desktop: compact people selector and SVG on the left; independently scrolling full overview/channels/gates/contributions on the right. Mobile: natural vertical layout.
- Gate details: basics → Penta activation provenance → qualified Penta prose if present → the four ordinary reading lenses. Channels follow the same separation.
- Do not copy ordinary knowledge prose or invent missing Penta interpretations. Hide empty specialist modules and audit/source clutter in ordinary reading while retaining evidence internally.
- No new Gap, Functional, role-fit or Wa formula. Knowledge counts/identity and structural coverage semantics remain unchanged.
- Use separate feature message modules with `registerMessages`; coordinate edits to global translation/style files rather than racing on them.

## LAN and verification

User preview stays on port9961 and supports the trusted LAN. Private research and environment files are denied by Vite. No public port forwarding or blanket firewall disablement.

LAN HTTP lacks some secure-context APIs. UUID creation may use `crypto.getRandomValues` when native `randomUUID` is absent. Annual data integrity must retain SHA-256 verification; any fallback uses a vetted module chosen by the coordinator, never disabling checks.

Each task supplies targeted unit tests, isolated fictional-profile browser tests, build results and remaining failures. Integration additionally covers shared APIs, rapid edit races, deletion, multi-tab changes, unknown-time flags, both people in a connection, Team grouping, ordinary and Penta details, three languages, desktop/mobile layout and keyboard/focus paths.

A successful task-specific test is not a substitute for the final full integration/browser regression. Read-only status-card refreshes do not trigger commits, pushes, merges or deployment.
