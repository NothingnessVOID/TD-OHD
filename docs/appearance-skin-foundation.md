# Appearance and skin foundation

Baseline: `13c70f2ce4dab5199a2438bfc08475f1cbd23549`.
The foundation preserves the released Classic palette. The completed controls
add a More menu, a skin dialog, and a Chakra center palette.

## State and ownership

```text
<html data-theme="light|dark" data-skin="default" data-hd-skin="classic">
             │                     │                        │
             └──── theme variant ──┼──── site foundation ───┼── HD domain
                                   │                        │
               site-default.css: surfaces, type, accent      │
                          human-design-classic.css: sources, centers,
                          graph surfaces, gates, circuits, relationships
                                   │                        │
                                   └──── component CSS and SVG renderer
```

`src/lib/appearance.js` owns the three independent state axes and applies
the root attributes. `setTheme()`, `setSiteSkin()`, and
`setHumanDesignSkin()` notify one appearance subscriber. Site and HD CSS
updates immediately. The subscriber redraws the SVGs that resolve computed
tokens while rendering: birth, transit, timeline, and connection/composite.
The existing theme preference remains stored under `bodygraph-theme`. The
configured skins are site `default` and HD `classic` / `chakra`.
Preset selection and the six supported overrides are stored in
`td-ohd-appearance-v1`, independently for each preset and light/dark theme.
Restore Current Preset clears the current pair; Reset All returns to Classic
and the system theme preference, clearing all overrides.

Four Variable arrows surround the graph in fixed semantic positions:
determination / motivation above, environment / perspective below. They read
the existing chart Variable arrow or Tone, never the notation string.

## Site skin inputs

The default site skin lives in `src/styles/tokens/site-default.css`. Its
palette and site meanings are:

| Group | Tokens |
| --- | --- |
| Surfaces | `--bg`, `--bg-elevated`, `--bg-sunken` |
| Text | `--text`, `--text-secondary`, `--text-tertiary` |
| Borders | `--border`, `--border-subtle` |
| Accent and focus | `--accent`, `--accent-strong`, `--accent-soft`, `--accent-hover`, `--accent-on`, `--focus` |
| Depth | `--shadow-sm`, `--shadow`, `--shadow-lg`, `--modal-backdrop`, `--modal-overlay`, `--lens-active-shadow` |
| Independent state | `--status-error`, `--status-error-soft`, `--status-success`, `--status-success-soft`, `--status-caution-soft` |
| Site features | `--type-badge-bg`, `--type-badge-text`, `--type-badge-border`, `--type-strategy-text`, `--site-auth-glow`, `--site-auth-shadow` |

Some inputs inherit the same value between light and dark modes. The dark
section overrides values that differ. Layout constants such as
`--max-width`, `--header-height`, and the font family remain in `styles.css`
because they are not skin colors.

## Human Design skin inputs

The classic HD skin lives in `src/styles/tokens/human-design-classic.css`.
All source colors have one main input each: `--hd-personality`,
`--hd-design`, and `--hd-transit`. Their `--hd-personality-on`,
`--hd-design-on`, and `--hd-transit-on` inputs determine the text on
filled SVG gates. Transit text and soft fills derive from `--hd-transit` via
`--hd-transit-text` and `--hd-transit-soft`. `--hd-both`,
`--hd-both-on`, `--hd-undefined`, and `--hd-electromagnetic` cover separate
combined and relationship meanings.

| Group | Tokens |
| --- | --- |
| Center edge | `--hd-center-head`, `--hd-center-ajna`, `--hd-center-throat`, `--hd-center-g`, `--hd-center-heart`, `--hd-center-spleen`, `--hd-center-solar`, `--hd-center-sacral`, `--hd-center-root` |
| Center gradient core | The matching nine `--hd-center-<name>-core` tokens, each derived from its own edge input |
| Graph state | `--hd-inactive`, `--hd-inactive-on`, `--hd-undefined-center`, `--hd-center-stroke`, `--hd-defined-fill`, `--hd-undefined-fill`, `--hd-selection-ring` |
| Graph surfaces | `--hd-graph-panel-bg`, `--hd-graph-panel-border`, `--hd-graph-bg`, `--hd-timeline-panel-bg`, `--hd-timeline-panel-border` |
| Related surfaces | `--hd-tooltip-bg`, `--hd-tooltip-border`, `--hd-detail-bg`, `--hd-detail-border`, `--hd-legend-bg`, `--hd-legend-border`, `--hd-legend-text`, `--hd-planet-column-text` |
| Gate and channel appearance | `--hd-gate-number-size`, `--hd-gate-number-baseline-offset`, `--hd-gate-active-weight`, `--hd-gate-inactive-weight`, `--hd-gate-circle-opacity`, `--hd-inactive-channel-opacity`, `--hd-center-stroke-width`, `--hd-transit-ring-width`, `--hd-transit-hatch-opacity` |
| Chart types | `--hd-type-generator`, `--hd-type-manifesting-generator`, `--hd-type-manifestor`, `--hd-type-projector`, `--hd-type-reflector` |
| Circuits | `--hd-circuit-individual`, `--hd-circuit-individual-soft`, `--hd-circuit-tribal`, `--hd-circuit-tribal-soft`, `--hd-circuit-collective`, `--hd-circuit-collective-soft`, `--hd-circuit-integration`, `--hd-circuit-integration-soft` |
| Relationships | `--hd-connection-a`, `--hd-connection-a-on`, `--hd-connection-a-core`, `--hd-connection-b`, `--hd-connection-b-on`, `--hd-connection-b-core`, `--hd-connection-bridged`, `--hd-connection-bridged-on`, `--hd-connection-bridged-core`, `--hd-connection-both-on` |

The nine center edge and core inputs are independent even when the classic
skin gives several centers the same current color. Relationship A/B/bridged,
circuit classes, and chart types remain separate semantic families. They do
not borrow the Design/Personality/Transit source colors.

The file retains legacy aliases such as `--design`, `--graph-design`,
`--personality`, `--graph-personality`, `--transit-source`, and the older
center/circuit/connection names. They point to canonical inputs and contain
no second palette. New skin files should define canonical `--hd-*` inputs.

## Adding a skin later

Add a site skin stylesheet with `[data-skin="new-name"]` and
`[data-skin="new-name"][data-theme="dark"]` rules, or an HD stylesheet with
the corresponding `data-hd-skin` selectors. Import the new stylesheet after
the default token files. Supply the HD source colors together with their
`-on` values, all nine center colors, inactive colors, graph surfaces, gate
parameters, and both theme variants. The center `-core` values can be
derived from each center edge with `color-mix()` or specified separately.

Use the appearance API to select the skin. SVGs redraw from the new computed
tokens; CSS driven details, legends, and planet rows update through the root
attribute. A skin with different color formats does not need changes to
`bodygraph.js`, `transits.js`, `timeline.js`, or the detail views. See
`appearance-color-audit.md` for the literal inventory and exceptions.

## Validation

`npm test` includes independent axis and token contract checks.
`npm run e2e:appearance` injects temporary Design, Transit, G, and Root test
colors to verify linkage and independence, then tests a live light/dark
switch. The test colors are not committed in either production skin.
