# Paired channel card layout — Windows 9961 verification

Base: `cc6e58df080918a32979f40efa3a792047f0aca4`.
Product commit: `4b080956c37fa4ae2d6212e2169fb15588161a53`.
Preview: http://127.0.0.1:9961/ and http://192.168.10.99:9961/ .

Only the gate-detail associated cards containing a paired-gate button use the new single-column grid. It removes the anonymous line box around the channel title, retains four information layers, uses 8px vertical / 12px horizontal padding and preserves the existing 10px separation between cards. No negative margins or overlapping targets are used. The paired native button uses flex alignment to center the entire text block inside its >=44px hit target; number, separator and name share one accent-colored, weight-500 link container. Hover and focus underline that full object; the smaller secondary label remains explanatory.

The status classes, translated text, source calculation, circuit badges, navigation/history, full channel detail/title/timing, Issue 23 cards and Penta implementation remain unchanged. Center-associated cards do not match the :has selector. No new terminology or translation is introduced.

## Same-condition measurements

Captured real gate 20 through the 9961 SVG, zh-CN, default light Skin, fictional birth 2000-05-10 12:30 UTC+8, 900px viewport height. Widths 1280/390/320 all produced the following values:

| Channel | Before | After | Reduction |
|---|---:|---:|---:|
| 10–20 | 132.796875px | 125.5px | 7.296875px |
| 20–34 | 132.796875px | 125.5px | 7.296875px |
| 20–57 | 132.796875px | 125.5px | 7.296875px |

Each card shrank about 5.5%; three cards together shrink 21.890625px, excluding unchanged inter-card spacing. Title→badge rectangle gap: 5.796875→4px; badge→status: 4→4px. The status-to-hit-box gap is 2→0px; the 44px hit box itself retains vertically centered text, so the visible text gap is larger than zero. We do not claim that the glyph gap is 6–8px: preserving a centered 44px target imposes natural half-leading. Before actual label-glyph top was 16.25px below the status; the new dedicated test verifies text centering, no overlap and reduced same-line spacing.

Before/after screenshots and measurements: `artifacts/issue22-compact/{before,after}/{1280,390,320}-gate20.png` and `metrics.json`. Same capture script: `artifacts/issue22-compact/capture.mjs`. All images were staged for review.

## Integrated checks

- Static frontend build and Pages bundle exclusion check passed; local build only. Existing runtime-resolved font CSS / large-chunk warnings remain.
- 23 localization tests passed.
- 43 fixed-source/history checks passed, preserving negative mutations and exact boundaries.
- 9961 timeline gate/channel/center header layout (873/390) and Penta card/graph hover, dismissal, focus and mobile tap checks passed.
- Final matrices passed: 43 compact cases with 301 exact associated/full status comparisons, 43 updated paired-visual cases, and 43 unchanged navigation/business cases. All 129 measured gate-20 cards shrank; circuit badge dimensions and center detail markup/layout stayed equal to baseline. Full evidence is recorded in ISSUE-22-COMPACT.md.

Physical-device Safari/Android and a full all-feature suite are not part of this local UI pass. Development branch only: no main merge, Issue closure, GitHub Pages or Netlify deployment.
