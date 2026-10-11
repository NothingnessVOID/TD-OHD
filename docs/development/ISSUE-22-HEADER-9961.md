# Issue 22 header labels and separator — 9961 integration

Base `aee63103dec82bb262c88dbbd8adee785f9de607`; product commit `fafec304a2c0553df8bd1b91561e6db3d345bc97`.

Gate-only associated cards now place title + unchanged circuit badge group inside a left-aligned wrapping Flex header (8px horizontal/4px wrap gap), with the existing source status independently below it. The harmonic entry retains its original link behavior, font/color feedback, 30px desktop and 44px phone/coarse-pointer targets. Separator declaration is `1.5px solid var(--border)`. No center, source, calculation, navigation or full-detail change.

Integrated Windows preview: http://127.0.0.1:9961/ / http://192.168.10.99:9961/ .
Actual gate 20 zh-CN measurements at 900px height, in default-light/default-dark/high-contrast:

| Width | 10–20 | 20–34 | 20–57 | Header behavior |
|---|---:|---:|---:|---|
| 1280 | 88px | 88px | 88px | title and badges share row |
| 390 | 102px | 102px | 102px | title and badges share row |
| 320 | 102px | 125.5px | 125.5px | longer titles naturally wrap badge group |

All statuses are below both title and badge group; no horizontal overflow. Phone targets remain 44px. Layout increase at 320px is the actual extra label row, not padding. DPR1 Chromium resolves the 1.5px declaration to a 1px computed border; color resolves to the existing --border token (light rgb(221,215,207), dark rgb(51,46,40), high contrast rgba(92,75,70,0.22)). No new palette or Skin override was added. Desktop light and phone dark screenshots were manually inspected: separator is visible but subordinate to text.

Evidence: `artifacts/issue22-header-labels/9961/{1280,390,320}-{default-light,default-dark,high-contrast}.png` and `metrics.json`; capture script alongside. Selected screenshots staged for review.

Parent validation: static frontend build, Pages bundle exclusion check, 23 localization tests, timeline gate/channel/center heading geometry and Penta hover/dismissal/focus/mobile regressions passed. Build retains existing font-CSS runtime-resolution/large-chunk warnings. Focused gate/status/layout test results and scope audit are recorded in the implementation report.

Only development preview/push authorized. No main merge, Issue closure, GitHub Pages or Netlify deployment. No claim of physical-device or Safari validation.
