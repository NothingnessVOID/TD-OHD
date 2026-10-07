// Approved center edge/core/foreground values. Source semantics remain owned by Skin.
export const CENTER_KEYS = Object.freeze(["head", "ajna", "throat", "g", "heart", "spleen", "solar", "sacral", "root"]);
export const CENTER_PALETTE_TOKENS = Object.freeze(CENTER_KEYS.flatMap(id => [`--hd-center-${id}`, `--hd-center-${id}-core`, `--hd-center-${id}-on`]));
export const CENTER_PALETTES = Object.freeze([
  Object.freeze({
    id: 'classic', name: 'Classic', tagline: 'Classic structure', render: 'soft-radial', coreEdgeRatio: 92,
    preview: Object.freeze({"head": "#D9BC55", "ajna": "#8FAF72", "throat": "#B88957", "g": "#D9BC55", "heart": "#C65B51", "spleen": "#B88957", "solar": "#B88957", "sacral": "#C65B51", "root": "#B88957"}),
    foreground: Object.freeze({"head": "#111111", "ajna": "#111111", "throat": "#111111", "g": "#111111", "heart": "#111111", "spleen": "#111111", "solar": "#111111", "sacral": "#111111", "root": "#111111"}),
    signature: '#B88957', darkEdge: null,
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
    id: 'jewel', name: 'Jewel', tagline: 'Jewel tones', render: 'solid', coreEdgeRatio: 100,
    preview: Object.freeze({"head": "#6E3FA0", "ajna": "#384D9B", "throat": "#1F6F9A", "g": "#2E7D64", "heart": "#3E7B48", "spleen": "#696B24", "solar": "#8F5D12", "sacral": "#A44D1E", "root": "#8E3030"}),
    foreground: Object.freeze({"head": "#FFFFFF", "ajna": "#FFFFFF", "throat": "#FFFFFF", "g": "#FFFFFF", "heart": "#FFFFFF", "spleen": "#FFFFFF", "solar": "#FFFFFF", "sacral": "#FFFFFF", "root": "#FFFFFF"}),
    signature: '#6E3FA0', darkEdge: null,
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
    id: 'ink', name: 'Ink', tagline: 'Monochrome', render: 'solid', coreEdgeRatio: 100,
    preview: Object.freeze({"head": "#606060", "ajna": "#606060", "throat": "#606060", "g": "#606060", "heart": "#606060", "spleen": "#606060", "solar": "#606060", "sacral": "#606060", "root": "#606060"}),
    foreground: Object.freeze({"head": "#FFFFFF", "ajna": "#FFFFFF", "throat": "#FFFFFF", "g": "#FFFFFF", "heart": "#FFFFFF", "spleen": "#FFFFFF", "solar": "#FFFFFF", "sacral": "#FFFFFF", "root": "#FFFFFF"}),
    signature: '#606060', darkEdge: "#96938E",
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
    preview: Object.freeze({"head": "#A89B54", "ajna": "#78906A", "throat": "#568979", "g": "#659A70", "heart": "#6D8E5D", "spleen": "#8B884E", "solar": "#9C7E4E", "sacral": "#9A5B43", "root": "#70584A"}),
    foreground: Object.freeze({"head": "#111111", "ajna": "#111111", "throat": "#111111", "g": "#111111", "heart": "#111111", "spleen": "#111111", "solar": "#111111", "sacral": "#FFFFFF", "root": "#FFFFFF"}),
    signature: '#A89B54', darkEdge: null,
    cssSource: 'src/styles/center-palettes/botanical.css'
  }),
  Object.freeze({
    id: 'paper', name: 'Paper', tagline: 'Paper palette', render: 'solid', coreEdgeRatio: 100,
    preview: Object.freeze({"head": "#B79A51", "ajna": "#72877D", "throat": "#58788B", "g": "#798765", "heart": "#91483E", "spleen": "#927953", "solar": "#9E6B43", "sacral": "#A44C3B", "root": "#675348"}),
    foreground: Object.freeze({"head": "#111111", "ajna": "#111111", "throat": "#FFFFFF", "g": "#111111", "heart": "#FFFFFF", "spleen": "#111111", "solar": "#FFFFFF", "sacral": "#FFFFFF", "root": "#FFFFFF"}),
    signature: '#B79A51', darkEdge: null,
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
