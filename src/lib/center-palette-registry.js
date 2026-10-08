// Approved center edge/core/foreground values. Source semantics remain owned by Skin.
export const CENTER_KEYS = Object.freeze(["head", "ajna", "throat", "g", "heart", "spleen", "solar", "sacral", "root"]);
export const CENTER_PALETTE_TOKENS = Object.freeze(CENTER_KEYS.flatMap(id => [`--hd-center-${id}`, `--hd-center-${id}-core`, `--hd-center-${id}-on`]));
export const CENTER_PALETTES = Object.freeze([
  Object.freeze({
    id: 'classic', name: 'Classic', tagline: 'Classic structure', render: 'soft-radial', coreEdgeRatio: 78,
    preview: Object.freeze({"head": "#E2C754", "ajna": "#93C179", "throat": "#CA9963", "g": "#E2C754", "heart": "#D76C5E", "spleen": "#CA9963", "solar": "#CA9963", "sacral": "#D76C5E", "root": "#CA9963"}),
    foreground: Object.freeze({"head": "#111111", "ajna": "#111111", "throat": "#111111", "g": "#111111", "heart": "#111111", "spleen": "#111111", "solar": "#111111", "sacral": "#111111", "root": "#111111"}),
    signature: '#CA9963', darkEdge: null,
    cssSource: 'src/styles/center-palettes/classic.css'
  }),
  Object.freeze({
    id: 'chakra', name: 'Chakra', tagline: 'Spectrum', render: 'soft-radial', coreEdgeRatio: 92,
    preview: Object.freeze({"head": "#8F79AE", "ajna": "#5F6EA3", "throat": "#5E91B0", "g": "#6F9E86", "heart": "#65946E", "spleen": "#A89C56", "solar": "#C6A84E", "sacral": "#C98354", "root": "#B8645A"}),
    foreground: Object.freeze({"head": "#111111", "ajna": "#FFFFFF", "throat": "#111111", "g": "#111111", "heart": "#111111", "spleen": "#111111", "solar": "#111111", "sacral": "#111111", "root": "#111111"}),
    signature: '#8F79AE', darkEdge: null,
    cssSource: 'src/styles/center-palettes/chakra.css'
  }),
  Object.freeze({
    id: 'jewel', name: 'Jewel', tagline: 'Jewel tones', render: 'soft-radial', coreEdgeRatio: 82,
    preview: Object.freeze({"head": "#7C44B2", "ajna": "#465DB5", "throat": "#1B7FB0", "g": "#1C8272", "heart": "#35965D", "spleen": "#88953A", "solar": "#BA8024", "sacral": "#CE632B", "root": "#AE444C"}),
    foreground: Object.freeze({"head": "#FFFFFF", "ajna": "#FFFFFF", "throat": "#FFFFFF", "g": "#FFFFFF", "heart": "#111111", "spleen": "#111111", "solar": "#111111", "sacral": "#111111", "root": "#FFFFFF"}),
    signature: '#7C44B2', darkEdge: null,
    cssSource: 'src/styles/center-palettes/jewel.css'
  }),
  Object.freeze({
    id: 'mineral', name: 'Mineral', tagline: 'Earth tones', render: 'solid', coreEdgeRatio: 100,
    preview: Object.freeze({"head": "#C2A34B", "ajna": "#7E9272", "throat": "#9B7B61", "g": "#B59B66", "heart": "#A95B4C", "spleen": "#8A7A55", "solar": "#A87643", "sacral": "#B25D3B", "root": "#765849"}),
    foreground: Object.freeze({"head": "#111111", "ajna": "#111111", "throat": "#111111", "g": "#111111", "heart": "#FFFFFF", "spleen": "#111111", "solar": "#111111", "sacral": "#FFFFFF", "root": "#FFFFFF"}),
    signature: '#A87643', darkEdge: null,
    cssSource: 'src/styles/center-palettes/mineral.css'
  }),
  Object.freeze({
    id: 'ink', name: 'Graphite', tagline: 'Monochrome', render: 'solid', coreEdgeRatio: 100,
    preview: Object.freeze({"head": "#3F3F3F", "ajna": "#3F3F3F", "throat": "#3F3F3F", "g": "#3F3F3F", "heart": "#3F3F3F", "spleen": "#3F3F3F", "solar": "#3F3F3F", "sacral": "#3F3F3F", "root": "#3F3F3F"}),
    foreground: Object.freeze({"head": "#FFFFFF", "ajna": "#FFFFFF", "throat": "#FFFFFF", "g": "#FFFFFF", "heart": "#FFFFFF", "spleen": "#FFFFFF", "solar": "#FFFFFF", "sacral": "#FFFFFF", "root": "#FFFFFF"}),
    signature: '#3F3F3F', darkEdge: "#96938E",
    cssSource: 'src/styles/center-palettes/ink.css'
  }),
  Object.freeze({
    id: 'porcelain', name: 'Porcelain', tagline: 'Soft color', render: 'soft-radial', coreEdgeRatio: 95,
    preview: Object.freeze({"head": "#B7A7C9", "ajna": "#A7B0CE", "throat": "#9DBDD0", "g": "#A8C4B4", "heart": "#A7BEA8", "spleen": "#C8C49B", "solar": "#D6C28B", "sacral": "#D7A98A", "root": "#C9958F"}),
    foreground: Object.freeze({"head": "#111111", "ajna": "#111111", "throat": "#111111", "g": "#111111", "heart": "#111111", "spleen": "#111111", "solar": "#111111", "sacral": "#111111", "root": "#111111"}),
    signature: '#9DBDD0', darkEdge: null,
    cssSource: 'src/styles/center-palettes/porcelain.css'
  }),
  Object.freeze({
    id: 'botanical', name: 'Botanical', tagline: 'Botanical palette', render: 'solid', coreEdgeRatio: 100,
    preview: Object.freeze({"head": "#D8C66A", "ajna": "#9DBD79", "throat": "#70B7A6", "g": "#86BE83", "heart": "#8CB46D", "spleen": "#B5B46C", "solar": "#C8A06A", "sacral": "#C87C60", "root": "#A58A79"}),
    foreground: Object.freeze({"head": "#111111", "ajna": "#111111", "throat": "#111111", "g": "#111111", "heart": "#111111", "spleen": "#111111", "solar": "#111111", "sacral": "#111111", "root": "#111111"}),
    signature: '#86BE83', darkEdge: null,
    cssSource: 'src/styles/center-palettes/botanical.css'
  }),
  Object.freeze({
    id: 'paper', name: 'Paper', tagline: 'Paper palette', render: 'solid', coreEdgeRatio: 100,
    preview: Object.freeze({"head": "#D3B46D", "ajna": "#8FA9A0", "throat": "#7897A8", "g": "#9AA981", "heart": "#C17461", "spleen": "#AE9875", "solar": "#C48A59", "sacral": "#CF735C", "root": "#A08670"}),
    foreground: Object.freeze({"head": "#111111", "ajna": "#111111", "throat": "#111111", "g": "#111111", "heart": "#111111", "spleen": "#111111", "solar": "#111111", "sacral": "#111111", "root": "#111111"}),
    signature: '#C17461', darkEdge: null,
    cssSource: 'src/styles/center-palettes/paper.css'
  }),
  Object.freeze({
    id: 'night-bloom', name: 'Night Bloom', tagline: 'Night color', render: 'solid', coreEdgeRatio: 100,
    preview: Object.freeze({"head": "#B38FC6", "ajna": "#7F90C5", "throat": "#69A0B0", "g": "#6F9E89", "heart": "#85A873", "spleen": "#A9A05D", "solar": "#C19359", "sacral": "#C37365", "root": "#9E5968"}),
    foreground: Object.freeze({"head": "#111111", "ajna": "#111111", "throat": "#111111", "g": "#111111", "heart": "#111111", "spleen": "#111111", "solar": "#111111", "sacral": "#111111", "root": "#FFFFFF"}),
    signature: '#B38FC6', darkEdge: null,
    cssSource: 'src/styles/center-palettes/night-bloom.css'
  }),
]);
export const getCenterPalette = id => CENTER_PALETTES.find(palette => palette.id === id) ?? null;
// Ink alone has an explicitly approved dark-mode edge.
export const centerPaletteDarkColor = (palette, edge) => palette.darkEdge ?? edge;
