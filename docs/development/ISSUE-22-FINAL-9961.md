# Issue 22 three-row associated cards — 9961 delivery measurements

Base: `7ff318ad5e68c353c64d8cb8226fac48a3244cc3` (local and remote development branch checked clean before work).
Product source: `ee6bfb100e23e13af0d33bb590a82600a805dbb0`.
Preview: http://127.0.0.1:9961/ / http://192.168.10.99:9961/ .

Only associated cards containing a harmonic gate entry are changed. Three rows: channel title; a left-aligned wrapping Flex row containing existing circuit badges and existing channel status; harmonic link separated by `1px solid var(--border-subtle)`. The metadata row has 8px horizontal / 4px wrap gaps. Card vertical padding is 6px with 4px row gap; adjacent card margin remains 10px. Desktop harmonic target is at least 30px; <=600px or coarse-pointer devices retain at least 44px. No negative margins, overlapping hit layers, cropping, arrows, backgrounds or decorative shadows were introduced.

State classes/text/source logic, i18n, navigation, center detail rendering, full channel titles/cards/timing, Penta, engine, Knowledge and person storage remain unchanged. The number, separator and name continue as one accent-colored link object; the explanatory label remains secondary.

## Actual same-condition comparison

Real 9961 BodyGraph click, gate 20, fictional birth 2000-05-10 12:30 UTC+8, zh-CN, default light Skin, 900px viewport height. Phone runs use touch emulation. Each of 10–20, 20–34 and 20–57 gave the same measurements:

| Viewport | Before per card | After per card | Reduction per card | Three-card reduction |
|---|---:|---:|---:|---:|
| 1280px desktop | 125.5px | 89.5px | 36px (28.7%) | 108px |
| 390px phone | 125.5px | 103.5px | 22px (17.5%) | 66px |
| 320px phone | 125.5px | 103.5px | 22px (17.5%) | 66px |

After: title→badges 4px; badge/status tops align (previously separated by 24px); all three metadata pairs are actually on the same visual row; status→separator region 6px. Hit heights are 30/44/44px. Actual border is 1px solid rgb(234,230,224), resolved from the existing subtle-border token. No horizontal overflow. Content can naturally wrap when translated metadata exceeds available width; the table above describes the measured Chinese no-wrap case, not a forced height for every language/state.

The centered link glyph has about 6.75px top/7.25px bottom space on desktop and 13.75px/14.25px on phones. Mobile spacing preserves the 44px target rather than overlapping adjacent content. Screenshots were manually reviewed at 320px and desktop, and before/after images staged for review.

Evidence: `artifacts/issue22-final-layout/{before,after}/metrics.json` and `{1280,390,320}-gate20.png`. Same capture script: `artifacts/issue22-final-layout/capture.mjs`.

## Parent integration checks

Local static frontend build and Pages bundle exclusion check passed; 23 localization tests passed. Existing runtime-font-CSS resolution and large-chunk warnings remain. Timeline channel/gate/center detail geometry (873/390px) and Penta hover/close/keyboard/mobile regression passed on integrated 9961. Product source was not edited during capture.

Focused layout/interaction matrix and source-audit outcomes are recorded in ISSUE-22-FINAL-LAYOUT.md and final delivery. No full all-feature suite or physical-device Safari testing is claimed. Development branch only; no main merge, Issue closure, GitHub Pages or Netlify deployment.
