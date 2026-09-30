# Appearance color audit

This audit covers the appearance foundation introduced after `13c70f2`.
It classifies color literals by meaning rather than treating every alpha value
or `currentColor` as a palette entry. Locations and counts below refer to the
files at the end of this change, before any future skin is added.

## Scope and method

Scanned `src/**/*.css`, `src/**/*.js`, `index.html`, the integration HTML, and
`tests/*.test.js` for hex colors, `rgb()` / `rgba()`, `hsl()` / `hsla()`,
`color-mix()`, and CSS color keywords. Counts are **occurrences**, not unique
colors. The separate light and dark definitions each count once. CSS class
names and English prose containing words like “red” do not count as palette
values. `transparent` and `currentColor` are included in the exception review.

## Classification

| Class | Ownership | Representative locations and rationale |
| --- | --- | --- |
| A. Site foundation | `src/styles/tokens/site-default.css` | Page and surface colors, text, border, accent, focus, shadows, backdrop, and shared site controls. These are site skin values; dark mode overrides the same token names. |
| B. Human Design | `src/styles/tokens/human-design-classic.css` | Three activation sources, nine independent centers and their gradient cores, gate and channel inactive states, graph/detail/tooltip/legend surfaces, chart type colors, circuit colors, and relationship colors. The current classic skin supplies light and dark values. |
| C. Independent meanings | Site status tokens and separate HD type, circuit, and relationship tokens | Error, success, caution, type badges, relationship A/B/bridged, and circuit categories have their own meanings. Equal current hex values do not make them aliases of Design, Personality, or Transit. |
| D. Justified exceptions | Inherited/transparent rendering and structural effects | `currentColor` in SVG icons inherits text color. `transparent` creates hit areas, empty fills, and overlay blends. `color-mix()` derives soft colors from semantic tokens; it does not establish another source color. Historical references to conventional red/black in `planet-reference.js` are explanatory prose. |

## Source linkage

`--hd-personality`, `--hd-design`, and `--hd-transit` are the only three
activation-source main color inputs. Each has an `-on` counterpart for SVG gate
foreground contrast. Legacy component variables such as `--personality`,
`--graph-personality`, `--design`, `--graph-design`, and `--transit-source` are
aliases. Their values follow the canonical token instead of repeating hex
definitions. The birth chart, transit page, timeline graph columns, tooltips,
legend, Gate Detail, and Planet Detail use these tokens through the aliases or
source-specific selectors.

The nine `--hd-center-*` inputs correspond to Head, Ajna, Throat, G, Heart,
Spleen, Solar Plexus, Sacral, and Root. Each `-core` gradient token follows its
own center input. Relationship A, B, and bridged colors are intentionally
separate from the three activation sources.

## Literal inventory and residual review

At the end of this change, the scan found **125 literal color occurrences** in
`src` and `index.html`: 53 in `site-default.css` (43 hex, 10 `rgba()`), 72 hex
in `human-design-classic.css`, and **zero** in other source CSS, JavaScript, or
HTML files. `color-mix()` references are derived values and were reviewed
separately; they stay in the token layer or consume its semantic variables.

The retained `rgba()` values define site shadows and modal overlays. Their
alpha is part of the visual effect, not an activation-source palette. The two
token files retain the actual classic and default palette literals so they can
be configured in one place. Source code elsewhere uses `transparent`,
`currentColor`, and `none` where SVG geometry or inherited color requires them.
The deliberate #7B2CFF and #00EE44 values in `tests/appearance-skin-e2e.mjs`
are temporary browser probes; they never enter the production skin.

## Verification boundary

This is a source audit, not a claim that every color combination has passed
visual contrast review. Temporary purple Design, alternate Transit, individual
G/Root, and light/dark browser checks belong in the implementation validation
report. No test colors are part of the production palette.
