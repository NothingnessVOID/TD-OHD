/** A Skin owns site and chart semantics. Centers and fonts are separate axes. */
export const SKINS = Object.freeze([
  Object.freeze({
    id: 'default-light', name: 'Default Light', mode: 'light', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#faf8f5', text: '#1a1714', accent: '#c47a2a', personality: '#2d2d2d', design: '#c0392b', transit: '#1af4ff' }),
    cssSource: 'src/styles/skins/default.css'
  }),
  Object.freeze({
    id: 'default-dark', name: 'Default Dark', mode: 'dark', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#141210', text: '#e8e4de', accent: '#d4943a', personality: '#e0dcd6', design: '#e74c3c', transit: '#1af4ff' }),
    cssSource: 'src/styles/skins/default.css'
  }),
  Object.freeze({
    id: 'high-contrast', name: 'High Contrast', mode: 'light', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#FAF8F7', text: '#1A1C1E', accent: '#3A6B85', personality: '#202428', design: '#B84A44', transit: '#3A6B85' }),
    cssSource: 'src/styles/skins/high-contrast.css'
  }),
  Object.freeze({
    id: 'grass-aroma', name: 'Grass Aroma', mode: 'light', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#F5F8F3', text: '#2E3832', accent: '#5BA88C', personality: '#344039', design: '#B76A58', transit: '#4D9179' }),
    cssSource: 'src/styles/skins/grass-aroma.css'
  }),
  Object.freeze({
    id: 'contemplation', name: 'Contemplation', mode: 'light', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#F3F5F7', text: '#2C3238', accent: '#7E99A8', personality: '#313740', design: '#A16872', transit: '#7E99A8' }),
    cssSource: 'src/styles/skins/contemplation.css'
  }),
  Object.freeze({
    id: 'absolutely', name: 'Absolutely', mode: 'light', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#F4F3EE', text: '#2D2B28', accent: '#D97757', personality: '#141413', design: '#7F7068', transit: '#D97757' }),
    cssSource: 'src/styles/skins/absolutely.css'
  }),
  Object.freeze({
    id: 'delve', name: 'Delve', mode: 'light', transitSourceMode: 'unified-natal',
    preview: Object.freeze({ surface: '#FFFFFF', text: '#1A1A1A', accent: '#2E75D4', personality: '#1A1A1A', design: '#6F6F6F', transit: '#2E75D4' }),
    cssSource: 'src/styles/skins/delve.css'
  }),
  Object.freeze({
    id: 'deep-think', name: 'Deep Think', mode: 'light', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#FCFCFD', text: '#1D1D1F', accent: '#4D6BFE', personality: '#252A36', design: '#C26068', transit: '#4660E5' }),
    cssSource: 'src/styles/skins/deep-think.css'
  }),
  Object.freeze({
    id: 'new-warm-paper', name: 'New Warm Paper', mode: 'light', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#F5EFE4', text: '#2A2622', accent: '#537D96', personality: '#2A2622', design: '#8B2C1F', transit: '#537D96' }),
    cssSource: 'src/styles/skins/new-warm-paper.css'
  }),
  Object.freeze({
    id: 'midnight-contrast', name: 'Midnight Contrast', mode: 'dark', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#26343D', text: '#F0F6FA', accent: '#E6B1C4', personality: '#F0F6FA', design: '#7FA7B8', transit: '#E6B1C4' }),
    cssSource: 'src/styles/skins/midnight-contrast.css'
  }),
  Object.freeze({
    id: 'coral', name: 'Coral', mode: 'light', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#FDF6EC', text: '#1A3049', accent: '#1A3049', personality: '#1A3049', design: '#6E8C7A', transit: '#F37E63' }),
    cssSource: 'src/styles/skins/coral.css'
  })
]);
// All approved directions are now registered; no placeholder Skins.
export const PLANNED_SKIN_DIRECTIONS = Object.freeze([]);
export const CENTER_PALETTES = Object.freeze([
  Object.freeze({ id: 'classic', name: 'Classic', cssSource: 'src/styles/center-palettes/classic.css' }),
  Object.freeze({ id: 'chakra', name: 'Chakra', cssSource: 'src/styles/center-palettes/chakra.css' })
]);
export const getSkin = id => SKINS.find(skin => skin.id === id) ?? null;
// Presentation only. Missing/legacy Skin IDs retain the split display.
export const getTransitSourceMode = id => getSkin(id)?.transitSourceMode ?? 'split';
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
    '--hd-both', '--hd-both-on', '--hd-transit', '--hd-transit-on', '--hd-transit-text', '--hd-transit-soft', '--hd-overlay-natal', '--hd-overlay-natal-on'
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
