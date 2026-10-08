/** A Skin owns site and chart semantics. Centers and fonts are separate axes. */
export const SKINS = Object.freeze([
  Object.freeze({
    id: 'default-light', defaultCenterPalette: 'classic', name: 'Amber Dawn', tagline: 'Day', mode: 'light', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#F7F5F2', text: '#1E1B18', accent: '#B86F2C', personality: '#282624', design: '#B84D43', transit: '#2D929F', signature: '#B86F2C' }),
    cssSource: 'src/styles/skins/default.css'
  }),
  Object.freeze({
    id: 'default-dark', defaultCenterPalette: 'mineral', name: 'Amber Dusk', tagline: 'Night', mode: 'dark', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#161412', text: '#F0EBE4', accent: '#D69A55', personality: '#E9E4DD', design: '#E16F60', transit: '#65B8C0', signature: '#D69A55' }),
    cssSource: 'src/styles/skins/default.css'
  }),
  Object.freeze({
    id: 'high-contrast', defaultCenterPalette: 'classic', name: 'High Contrast', tagline: 'High contrast', mode: 'light', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#FAF8F7', text: '#1A1C1E', accent: '#3A6B85', personality: '#202428', design: '#B84A44', transit: '#3A6B85', signature: '#3A6B85' }),
    cssSource: 'src/styles/skins/high-contrast.css'
  }),
  Object.freeze({
    id: 'grass-aroma', defaultCenterPalette: 'botanical', name: 'Grass Aroma', tagline: 'Butter', mode: 'light', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#F5F8F3', text: '#2E3832', accent: '#5BA88C', personality: '#344039', design: '#B76A58', transit: '#5AA486', signature: '#5BA88C' }),
    cssSource: 'src/styles/skins/grass-aroma.css'
  }),
  Object.freeze({
    id: 'contemplation', defaultCenterPalette: 'porcelain', name: 'Contemplation', tagline: 'Ming', mode: 'light', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#F3F5F7', text: '#2C3238', accent: '#7E99A8', personality: '#313740', design: '#A16872', transit: '#6F9DB2', signature: '#7E99A8' }),
    cssSource: 'src/styles/skins/contemplation.css'
  }),
  Object.freeze({
    id: 'absolutely', defaultCenterPalette: 'mineral', name: 'Absolutely', tagline: 'A little familiar', mode: 'light', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#F4F3EE', text: '#2D2B28', accent: '#D97757', personality: '#141413', design: '#788C5D', transit: '#D97757', signature: '#D97757' }),
    cssSource: 'src/styles/skins/absolutely.css'
  }),
  Object.freeze({
    id: 'delve', defaultCenterPalette: 'ink', name: 'Delve', tagline: 'Explore', mode: 'light', transitSourceMode: 'unified-natal',
    preview: Object.freeze({ surface: '#FFFFFF', text: '#1A1A1A', accent: '#111111', personality: '#1A1A1A', design: '#6F6F6F', transit: '#2E75D4', signature: '#2E75D4' }),
    cssSource: 'src/styles/skins/delve.css'
  }),
  Object.freeze({
    id: 'deep-think', defaultCenterPalette: 'jewel', name: 'Deep Think', tagline: 'Little Whale', mode: 'light', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#FCFCFD', text: '#1D1D1F', accent: '#4D6BFE', personality: '#252A36', design: '#C26068', transit: '#4660E5', signature: '#4D6BFE' }),
    cssSource: 'src/styles/skins/deep-think.css'
  }),
  Object.freeze({
    id: 'new-warm-paper', defaultCenterPalette: 'paper', name: 'New Warm Paper', tagline: 'Paper', mode: 'light', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#F5EFE4', text: '#2A2622', accent: '#537D96', personality: '#2A2622', design: '#8B2C1F', transit: '#4A94B2', signature: '#537D96' }),
    cssSource: 'src/styles/skins/new-warm-paper.css'
  }),
  Object.freeze({
    id: 'midnight-contrast', defaultCenterPalette: 'night-bloom', name: 'Midnight Contrast', tagline: 'Clear', mode: 'dark', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#26343D', text: '#F0F6FA', accent: '#E6B1C4', personality: '#F0F6FA', design: '#7FA7B8', transit: '#E6B1C4', signature: '#E6B1C4' }),
    cssSource: 'src/styles/skins/midnight-contrast.css'
  }),
  Object.freeze({
    id: 'coral', defaultCenterPalette: 'chakra', name: 'Coral', tagline: 'Spring paper', mode: 'light', transitSourceMode: 'split',
    preview: Object.freeze({ surface: '#FDF6EC', text: '#1A3049', accent: '#1A3049', personality: '#1A3049', design: '#6E8C7A', transit: '#F37E63', signature: '#F37E63' }),
    cssSource: 'src/styles/skins/coral.css'
  })
]);
// All approved directions are now registered; no placeholder Skins.
export const PLANNED_SKIN_DIRECTIONS = Object.freeze([]);
// Legacy imports remain valid; Center Palette has its own registry.
export { CENTER_PALETTES, CENTER_KEYS, CENTER_PALETTE_TOKENS, getCenterPalette } from './center-palette-registry.js';
export const getSkin = id => SKINS.find(skin => skin.id === id) ?? null;
// Presentation only. Missing/legacy Skin IDs retain the split display.
export const getTransitSourceMode = id => getSkin(id)?.transitSourceMode ?? 'split';
export const defaultSkinForMode = mode => mode === 'dark' ? 'default-dark' : 'default-light';
// Canonical contract only; legacy aliases are not palette inputs.
export const SKIN_TOKEN_GROUPS = Object.freeze({
  site: Object.freeze([
    '--bg', '--bg-elevated', '--bg-sunken', '--text', '--text-secondary', '--text-tertiary',
    '--border', '--border-subtle', '--accent', '--accent-strong', '--accent-hover', '--accent-soft', '--accent-on', '--focus',
    '--shadow-sm', '--shadow', '--shadow-lg', '--modal-backdrop', '--modal-overlay', '--lens-active-shadow',
    '--status-error', '--status-error-soft', '--status-success', '--status-success-soft', '--status-info', '--status-info-soft', '--status-caution', '--status-caution-soft',
    '--type-badge-bg', '--type-badge-text', '--type-badge-border', '--type-strategy-text', '--site-auth-glow', '--site-auth-shadow'
  ]),
  graph: Object.freeze([
    '--hd-graph-bg', '--hd-graph-panel-bg', '--hd-graph-panel-border', '--hd-inactive', '--hd-inactive-on',
    '--hd-undefined', '--hd-undefined-center', '--hd-center-stroke', '--hd-defined-fill', '--hd-undefined-fill', '--hd-selection-ring',
    '--hd-timeline-panel-bg', '--hd-timeline-panel-border', '--hd-timeline-birth', '--hd-timeline-transit',
    '--hd-timeline-both-birth', '--hd-timeline-both-transit', '--hd-timeline-both-on',
    '--hd-tooltip-bg', '--hd-tooltip-border',
    '--hd-detail-bg', '--hd-detail-border', '--hd-legend-bg', '--hd-legend-border', '--hd-legend-text', '--hd-planet-column-text'
  ]),
  sources: Object.freeze([
    '--hd-birth-personality', '--hd-birth-design',
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
