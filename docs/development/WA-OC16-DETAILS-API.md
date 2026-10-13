# Wa / OC16 detail strings (round 2)

Baseline: `d17442568a9a038f4057f75f3b355471c222894d`. Isolated branch: `feature/wa-oc16-details-r2`.

```js
import { createWaDetailRenderer } from './wa-detail-content.js';
import '../styles/wa-details.css';

const details = createWaDetailRenderer({
  getResult: () => known() ? result : null,
  nameOf: id => nameOf(id)
});

// Main department expansion, full dialog bodies, then compact graph selection.
details.renderPairRows(department, { compact: true });
details.renderDepartment('management');
details.renderPair('21-45');
details.renderGate(45);
details.renderSelected({ type: 'pair', id: '21-45' });
```

All methods return HTML strings. `renderPairRows` accepts a catalog/result department with `id`, or a department ID; it uses the canonical catalog order (core first). Other methods accept department ID, canonical channel ID (not display `45-21`), or numeric/numeric-string gate respectively. Invalid objects return `''`. `renderSelected` accepts the existing `{type,id}` shape; null, invalid, and department selections return `''`. It displays gate holders or both pair endpoints without additional open buttons, knowledge, or an empty panel.

The factory reads one current result per valid render call, accepts only `ready`/`empty`, and caches no result or scope. The parent owns scope selection, ready/loading/error gating, dialog stack/back/focus, all click delegation, and `bindSharedObjectDetails` for reading lenses. Parent must import the CSS once; the JS remains directly importable by Node unit tests. No DOM, dialog lifecycle, storage, analysis, color calculations, or chart lookups are introduced.

## Sources and rendering

- Endpoints: pair `holdersByGate[gate]`; gate detail/selected gate: `gateRecords`. Member activation groups preserve each supplied `{memberId,side,planet,gate,line}` including duplicate rows. Pair activation groups concatenate the two displayed gate records, then group by member.
- Shared named export: `renderActivationRows(activations, {nameOf})`. All four locations use it: inline, department, pair, gate. Undefined sources show unknown; supplied empty arrays show not covered.
- Relationships consume `selfCompleteMemberIds` and `complementaryMemberPairs` only. `firstMemberId` belongs to result `gates[0]`, `secondMemberId` to `gates[1]`; then display order is applied. For `45–21`, second is visually left and first right. One list row per displayed left member lists precisely the supplied opposite members. No Cartesian product is computed and no activation is deduplicated.
- Department numerators come directly from `result.departments`, denominators from the catalog. Unknown/missing results and fields show `—`/unknown; a supplied empty result may show true zero. No trailing all-contributors list.
- Reuses `gateName`, `hexagramName`, `planetName`, `renderGateDetailHeading`, `renderSharedGateReading`, `renderSharedChannelReading`, and `readWaContent` + `renderProse`. Core Wa summary/detail and source identifiers are preserved; supporting pairs retain standard channel reading. Knowledge is in closed native `details`; no source prose is copied or edited.
- `detail-messages.js` registers additional UI labels in `en`, `zh-CN`, `zh-Hant`. Existing department/status/side wording is read from `oc16-messages.js` without modifying it.
- Source chips use `--bg-elevated`; birth hues `--hd-birth-personality/design` (fallback `--hd-personality/design`) supply borders/dots. Text uses existing contrast-adjusted `--source-birthPersonality-text` / `--source-birthDesign-text`. General `--hd-*-on` is deliberately not paired with birth overrides. Explicit personality/design text makes color nonessential. Endpoint grids use two desktop columns and one column at 600px. Added text is 13/14px or larger; every CSS selector is Wa scoped.

## Stable assertions and events

| Attribute | Meaning |
| --- | --- |
| `data-wa-gate`, `data-wa-pair`, `data-wa-department` | Existing parent-owned navigation events |
| `data-wa-detail`, `data-wa-detail-id` | Full body kind and stable ID |
| `data-wa-selected`, `data-wa-selected-id` | Compact graph selection kind and ID |
| `data-pair-row` | Canonical channel ID of inline/department row |
| `data-wa-endpoint`, `data-wa-covered` | Endpoint gate and `true`/`false`/`unknown`; descendants `data-wa-member` identify exact holders |
| `data-wa-activation-member` | Activation member group |
| `data-wa-member`, `data-activation-side/planet/gate/line` | Each activation `li` retains raw source fields, HTML escaped |
| `data-wa-side` | Chip side: `personality`, `design`, or `unknown` |
| `data-wa-self-complete` | Members supplied as individually complete |
| `data-wa-combination-left/right` | Display-oriented members of supplied combinations |
| `data-wa-left-gate/right-gate` | Display endpoint gates on each combination row |
| `data-wa-state` | Supplied pair status, or `unknown` |
| `data-wa-gate-state` | `active`/`inactive`/`unknown` |
| `data-wa-gate-count`, `data-wa-pair-count` | Supplied department numerator, or `—` |
| `data-wa-gate-activations` | Closed per-gate activation `details` |
| `data-wa-knowledge`, `data-wa-content-id` | Closed knowledge `details`: `wa`/`channel`/`gate`, with canonical ID |
| `data-wa-reading-id`, `data-wa-package-id`, `data-wa-source-refs` | Existing Wa entry ID, alias/package ID and exact source IDs |
| `data-wa-prose` | Unchanged Wa prose slot: `summary` or `detail` |

Shared gate reading retains its `data-shared-*` attributes and lens events. Source/member IDs and names are escaped before HTML interpolation. Query members within the relevant endpoint/relationship/source container, since the same member legitimately appears in multiple contexts.

## Verification and ownership

`node --test tests/wa-detail-content.test.js` on Node 24: 14/14 pass. Tests cover five states, reversed canonical/display endpoint mapping, sparse combinations, multiple holders, planet multiplicity/P+D/duplicates, escaping, fresh scope, unknown versus zero, supplied department counts, three-language unchanged collapsed readings/IDs, compact selection, and CSS token/scope contracts.

No full suite or browser tests run in this worktree. Parent/D own real-WASM source oracle, all-skin/custom computed contrast, rendered layout, dialog stack/focus and integration. Only the new renderer, scoped CSS, detail messages, targeted test and this API document are assigned here. The component inventory and parent controller/styles remain parent-owned; this document records the new shared component for that integration.
