/** A Skin owns site and chart semantics. Centers and fonts are separate axes. */
export const SKINS = Object.freeze([
  Object.freeze({
    id: 'default-light', name: 'Default Light', mode: 'light',
    preview: Object.freeze({ surface: '#faf8f5', text: '#1a1714', accent: '#c47a2a', personality: '#2d2d2d', design: '#c0392b', transit: '#1af4ff' }),
    cssSource: 'src/styles/skins/default.css'
  }),
  Object.freeze({
    id: 'default-dark', name: 'Default Dark', mode: 'dark',
    preview: Object.freeze({ surface: '#141210', text: '#e8e4de', accent: '#d4943a', personality: '#e0dcd6', design: '#e74c3c', transit: '#1af4ff' }),
    cssSource: 'src/styles/skins/default.css'
  })
]);
// Future directions are documentation, not selectable or partially implemented Skins.
export const PLANNED_SKIN_DIRECTIONS = Object.freeze([
  'warm-paper', 'blue-night-high-contrast', 'anthropic-inspired', 'openai-inspired', 'deepseek-inspired'
]);
export const CENTER_PALETTES = Object.freeze([
  Object.freeze({ id: 'classic', name: 'Classic', cssSource: 'src/styles/center-palettes/classic.css' }),
  Object.freeze({ id: 'chakra', name: 'Chakra', cssSource: 'src/styles/center-palettes/chakra.css' })
]);
export const getSkin = id => SKINS.find(skin => skin.id === id) ?? null;
export const getCenterPalette = id => CENTER_PALETTES.find(palette => palette.id === id) ?? null;
export const defaultSkinForMode = mode => mode === 'dark' ? 'default-dark' : 'default-light';
// Canonical contract only; legacy aliases are not palette inputs.
export const SKIN_TOKEN_GROUPS = Object.freeze({
  site: Object.freeze([
    '--bg', '--bg-elevated', '--bg-sunken', '--text', '--text-secondary', '--text-tertiary',
    '--border', '--border-subtle', '--accent', '--accent-strong', '--accent-hover', '--accent-soft', '--accent-on', '--focus',
    '--shadow-sm', '--shadow', '--shadow-lg', '--modal-backdrop', '--modal-overlay', '--lens-active-shadow',
    '--status-error', '--status-error-soft', '--status-success', '--status-success-soft', '--status-caution-soft',
    '--type-badge-bg', '--type-badge-text', '--type-badge-border', '--type-strategy-text', '--site-auth-glow', '--site-auth-shadow'
  ]),
  graph: Object.freeze([
    '--hd-graph-bg', '--hd-graph-panel-bg', '--hd-graph-panel-border', '--hd-inactive', '--hd-inactive-on',
    '--hd-undefined', '--hd-undefined-center', '--hd-center-stroke', '--hd-defined-fill', '--hd-undefined-fill', '--hd-selection-ring',
    '--hd-timeline-panel-bg', '--hd-timeline-panel-border', '--hd-tooltip-bg', '--hd-tooltip-border',
    '--hd-detail-bg', '--hd-detail-border', '--hd-legend-bg', '--hd-legend-border', '--hd-legend-text', '--hd-planet-column-text'
  ]),
  sources: Object.freeze([
    '--hd-personality', '--hd-personality-on', '--hd-design', '--hd-design-on',
    '--hd-both', '--hd-both-on', '--hd-transit', '--hd-transit-on', '--hd-transit-text', '--hd-transit-soft'
  ]),
  types: Object.freeze(['generator', 'manifesting-generator', 'manifestor', 'projector', 'reflector'].map(id => `--hd-type-${id}`)),
  circuits: Object.freeze(['individual', 'collective', 'tribal', 'integration'].flatMap(id => [`--hd-circuit-${id}`, `--hd-circuit-${id}-soft`])),
  relationship: Object.freeze([
    '--hd-connection-a', '--hd-connection-a-on', '--hd-connection-a-core',
    '--hd-connection-b', '--hd-connection-b-on', '--hd-connection-b-core',
    '--hd-connection-both', '--hd-connection-both-on',
    '--hd-connection-bridged', '--hd-connection-bridged-on', '--hd-connection-bridged-core',
    '--hd-relationship-electromagnetic', '--hd-relationship-companionship', '--hd-relationship-compromise', '--hd-relationship-dominance'
  ])
});
export const SKIN_TOKENS = Object.freeze(Object.values(SKIN_TOKEN_GROUPS).flat());
export const CENTER_KEYS = Object.freeze(['head', 'ajna', 'throat', 'g', 'heart', 'spleen', 'solar', 'sacral', 'root']);
export const CENTER_PALETTE_TOKENS = Object.freeze(CENTER_KEYS.flatMap(id => [`--hd-center-${id}`, `--hd-center-${id}-core`]));
