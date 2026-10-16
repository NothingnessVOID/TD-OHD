# Wa / OC16 round 2 — contributor-first details

Baseline: `d17442568a9a038f4057f75f3b355471c222894d`, verified clean and equal to remote `feature/penta-wa-integration-v1` before work.

## Scope

The user accepted the six-core-channel SVG design. Keep its geometry, gates, pillar rings and five states. Improve scope clarity, exact gate-to-person provenance, detail reading order and responsive presentation. No Sharp/Penta/Wa calculation changes, no professional content rewrite, no data migration or new mechanism.

## A — scope and navigation

`3b87da9` adds the small presentation-only `resolveWaViewScope()` mapping. Organization includes Alpha and all assigned group members. Entering any individual Penta resets the optional Alpha switch to off; name and selected-member count appear together in the graph and detail header. The same resolved options drive the existing analyzeOC16 call. Selected participant counts do not imply that failed chart calculations succeeded.

Independent navigation keys `nav.team` and `nav.organization` render Team/Organization, 团队/组织, 團隊/組織. Technical page names and team/wa routes are unchanged. Three targeted tests pass, including unchanged organization coverage when only group assignments change, per-group source isolation and exact locale labels.

## B — one reading vocabulary

Stage B source: `4937b5d`. A pure HTML renderer consumes the current result's gateRecords, pairs, holdersByGate and exact activation/complementary-member records. It does not derive holders from a department's aggregate contributor list. Department rows show each gate's people directly. Pair details order identity, two endpoint summaries, member-grouped activations, exact structural relationships and folded existing knowledge. Gate details lead with identity, coverage and activation sources, followed by related pair/department and folded shared readings.

Personality/design badges use the actual birth-chart source palette and its existing readable-text tokens, including independently defined birth hues in certain Skins. No new color algorithm or hardcoded source colors. All source rows, including repeated gates across planets/sides, remain present.

## C — presentation and navigation

Stage C integration: `af14c04`; local focus/gutter follow-up: `f617416`; final navigation/focus/uncertainty fix: `4378db8`. Remove repeated Powerbase/scoring disclaimers and the permanently empty selected panel. Keep calculation errors, unsaved-edit/annotation-loss confirmations and archive warnings. A compact graph-underlay selection summary shows gate/endpoint members without adding names inside the SVG.

The graph no longer shrinks with viewport height. Short desktops use document flow rather than compressing labels to maintain sticky fit. Detail history retains scroll position, disclosure/lens state and focus per layer. Closing returns to the original trigger and page scroll; it does not rerender the full page solely to reflect selection. Native disclosure summaries explicitly use tabindex=0 to join the unchanged public dialog's focus list. Removing the outer `.view-section` padding avoids double gutters on phones.

## D — targeted acceptance results

Final product source: `4378db80af6a9795aec609370ae9412abdc1a7d2`. 19 targeted scope/rendering unit tests passed. The original real-WASM preview workflow also passed with the intentional group-default/focus expectations updated, preserving its full v1/v2 IndexedDB/history, missing-person, import/conflict and source-union assertions. A new real unknown-time Alpha check confirms the warning appears for organization/with-Alpha, never group-only.

`wa-oc16-details-e2e.mjs` passed against that fixed source on 9961. Its independent oracle reads all 26 actual WASM activations for 12 fictional people, not product analysis output. Seven scopes cover the whole organization and each group alone/with Alpha; 32 pair/64 gate details, direct endpoint names, every activation, self-completion and cross-member mappings are exact. All five states were witnessed in real data. Member5 gate54 has five distinct P/D planetary source rows, all preserved. People edits update results; missing-person errors render unknown/dashes instead of successful zeros.

Eleven Skins × default/custom source colors passed, with actual birth overrides respected and minimum measured source-text contrast 4.5030725572. Visual evidence includes 1440 and 1280 desktops, 390 and 320 phones, simplified/traditional/English, light/dark/high-contrast, and a short 1280×640 viewport. The short-screen graph remains 390px wide; original viewBox and SVG node geometry remain unchanged.

Strict keyboard checks now pass for Tab reaching knowledge summaries, Enter expansion/collapse and Tab wrapping. Detail navigation stays within the sheet; Back restores disclosure/scroll state, Escape restores the original trigger DOM/focus and page position. No force-click bypasses. The existing public Detail Dialog source is unchanged.

Earlier failures are retained: the first harness assumed a direct-child name rather than the final number-label wrapper; a full-page fixed-modal capture caused a non-reproduced click interception and was replaced with viewport captures. The later real failures exposed global absolute navigation CSS and closed-details child rectangles contaminating focus enumeration. Both were fixed with Wa-only CSS; failures were not reclassified as passes. Details and reproduction: `tests/wa-oc16-r2-test-evidence.md`.

Final static build and private-client bundle exclusion passed. Existing two font.css runtime-resolution warnings and large-chunk warning remain. SVG, OC16 catalog/calculation, Sharp, Penta, persistence/schema/DB2 and professional content have no changes from d174425. No known blocking UI issue remains within these targeted checks; physical-device/browser coverage beyond Chromium is not claimed.

Screenshots and `evidence.json`: `artifacts/visual-review/wa-oc16-details-r2/final-4378db8/` (28 PNGs). Required examples include organization, A, A+Alpha, management, 45–21, gate45 and repeated P/D activations, plus phone views. Final full regression and frozen historical UI audit updates remain deferred until user interaction acceptance. No main merge, Issue closure, Pages or Netlify deployment.
