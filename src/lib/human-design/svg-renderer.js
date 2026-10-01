// Pure SVG presentation for server, MCP and share-card output. No ephemeris or I/O.
// Adapted from the MIT renderer attributed in THIRD_PARTY_NOTICES.md.
import { GATE_PATHS, CENTER_SHAPES, GATE_CIRCLE_POSITIONS } from './bodygraph-geometry.js';

const VIEW_W = 851.41;
const VIEW_H = 1309.4;

// Canonical HD planet-column order (Nodes before Moon) and glyphs
export const PLANET_ORDER = [
  'sun', 'earth', 'northNode', 'southNode', 'moon', 'mercury',
  'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
];

export const PLANET_GLYPHS = {
  sun: '☉', earth: '⊕', moon: '☽', northNode: '☊', southNode: '☋',
  mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄',
  uranus: '♅', neptune: '♆', pluto: '♇'
};

const SHAPE_KEY_MAP = {
  Head: 'head', Ajna: 'ajna', Throat: 'throat',
  G: 'g', Ego: 'heart', Sacral: 'sacral',
  Spleen: 'spleen', SolarPlexus: 'solar', Root: 'root'
};

// Traditional center colors: Head & G yellow, Ajna green, Heart & Sacral
// red, Throat/Spleen/Solar Plexus/Root tan — light and dark variants.
export const THEMES = {
  light: {
    background: 'transparent',
    personality: '#262220',
    design: '#c0392b',
    inactive: '#eae5df',
    undefinedCenter: '#ffffff',
    centerStroke: '#cfc7be',
    gateTextActive: '#ffffff',
    gateTextInactive: '#a39a90',
    columnText: '#1a1714',
    centers: {
      head: '#e9d56b', ajna: '#a3c46c', throat: '#c2a06b',
      g: '#e9d56b', heart: '#dd6356', spleen: '#c2a06b',
      solar: '#c2a06b', sacral: '#dd6356', root: '#c2a06b'
    }
  },
  dark: {
    background: 'transparent',
    personality: '#cfc7bb',
    design: '#e05545',
    inactive: '#28241f',
    undefinedCenter: '#1e1c18',
    centerStroke: '#3a3630',
    gateTextActive: '#16130f',
    gateTextInactive: '#6f685f',
    columnText: '#e8e4de',
    centers: {
      head: '#bfa94e', ajna: '#7a9c52', throat: '#9c7f53',
      g: '#bfa94e', heart: '#b54a40', spleen: '#9c7f53',
      solar: '#9c7f53', sacral: '#b54a40', root: '#9c7f53'
    }
  }
};

const escAttr = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function activationMaps(chart) {
  const personality = new Set();
  const design = new Set();
  for (const g of Object.values(chart.gates?.personality || {})) if (g) personality.add(g.gate);
  for (const g of Object.values(chart.gates?.design || {})) if (g) design.add(g.gate);
  return { personality, design, active: new Set([...personality, ...design]) };
}

/**
 * Render a bodygraph as an SVG string.
 *
 * @param {object} chart - calculateHumanDesign() result
 * @param {object} [opts]
 * @param {('light'|'dark')} [opts.theme='light']
 * @param {object} [opts.themeOverrides] - merge over the chosen theme's colors
 * @param {boolean} [opts.gateNumbers=true]
 * @param {boolean} [opts.planetColumns=false] - render Design/Personality
 *   activation columns inside the SVG (adds ~200 units width each side)
 * @param {string} [opts.fontFamily='Inter, system-ui, sans-serif']
 * @param {string} [opts.id=''] - prefix for internal ids (pattern defs) so
 *   multiple graphs can coexist in one document
 * @returns {string} self-contained <svg> markup
 */
export function renderBodygraphSVG(chart, opts = {}) {
  const theme = { ...THEMES[opts.theme === 'dark' ? 'dark' : 'light'], ...(opts.themeOverrides || {}) };
  const centers = { ...theme.centers, ...((opts.themeOverrides || {}).centers || {}) };
  const gateNumbers = opts.gateNumbers !== false;
  const planetColumns = !!opts.planetColumns;
  const font = opts.fontFamily || 'Inter, system-ui, sans-serif';
  const idp = opts.id ? `${opts.id}-` : '';

  const { personality, design, active } = activationMaps(chart);
  const definedCenters = new Set(chart.centers?.definedNames || []);

  const gateFill = (g) => {
    const p = personality.has(g), d = design.has(g);
    if (p && d) return `url(#${idp}stripe-both)`;
    if (p) return theme.personality;
    if (d) return theme.design;
    return theme.inactive;
  };

  const colW = planetColumns ? 150 : 0;
  const pad = 16;
  const minX = -pad - colW;
  const width = VIEW_W + pad * 2 + colW * 2;
  const height = VIEW_H + pad * 2;

  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${-pad} ${width} ${height}" role="img" aria-label="${escAttr(svgLabel(chart))}">`);

  parts.push(`<defs><pattern id="${idp}stripe-both" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
    `<rect width="8" height="8" fill="${theme.personality}"/><rect width="4" height="8" fill="${theme.design}"/></pattern></defs>`);

  if (theme.background && theme.background !== 'transparent') {
    parts.push(`<rect x="${minX}" y="${-pad}" width="${width}" height="${height}" fill="${theme.background}"/>`);
  }

  // Channel half-paths (one per gate — hanging gates render naturally)
  parts.push('<g data-layer="paths">');
  for (const [gateStr, d] of Object.entries(GATE_PATHS)) {
    const g = parseInt(gateStr);
    parts.push(`<path d="${d}" fill="${gateFill(g)}" opacity="${active.has(g) ? 1 : 0.4}" data-gate="${g}"/>`);
  }
  parts.push('</g>');

  // Centers
  parts.push('<g data-layer="centers">');
  for (const [shapeKey, shape] of Object.entries(CENTER_SHAPES)) {
    const key = SHAPE_KEY_MAP[shapeKey];
    if (!key) continue;
    const defined = definedCenters.has(key);
    parts.push(`<path d="${shape.path}" fill="${defined ? centers[key] : theme.undefinedCenter}" ` +
      `stroke="${defined ? 'none' : theme.centerStroke}" stroke-width="1.5" data-center="${key}"/>`);
  }
  parts.push('</g>');

  // Gate circles + numbers
  parts.push('<g data-layer="gates">');
  for (const [gateStr, c] of Object.entries(GATE_CIRCLE_POSITIONS)) {
    const g = parseInt(gateStr);
    const isActive = active.has(g);
    const fill = gateFill(g);
    parts.push(`<circle cx="${c.cx}" cy="${c.cy}" r="${c.r || 12.3}" fill="${isActive ? fill : 'transparent'}" ` +
      `stroke="${isActive ? 'none' : theme.inactive}" stroke-width="1" data-gate="${g}"/>`);
    if (gateNumbers) {
      // Personality fill is light in dark theme — flip text for contrast
      const textColor = isActive
        ? (opts.theme === 'dark' && personality.has(g) ? theme.gateTextActive : '#ffffff')
        : theme.gateTextInactive;
      parts.push(`<text x="${c.cx}" y="${c.cy + 4}" text-anchor="middle" font-size="11" ` +
        `font-weight="${isActive ? 700 : 400}" font-family="${escAttr(font)}" fill="${textColor}">${g}</text>`);
    }
  }
  parts.push('</g>');

  // Optional in-SVG planet columns
  if (planetColumns) {
    parts.push(planetColumn(chart.gates?.design, -pad - colW + 10, theme.design, 'Design', chart.positions?.design?.date, font, theme));
    parts.push(planetColumn(chart.gates?.personality, VIEW_W + pad + 14, theme.personality, 'Personality', chart.positions?.personality?.date, font, theme));
  }

  parts.push('</svg>');
  return parts.join('');
}

function planetColumn(gates, x, color, title, date, font, theme) {
  const parts = [`<g data-layer="planets-${title.toLowerCase()}">`];
  parts.push(`<text x="${x}" y="440" font-size="26" font-weight="700" letter-spacing="2" ` +
    `font-family="${escAttr(font)}" fill="${color}">${title.toUpperCase()}</text>`);
  if (date) {
    parts.push(`<text x="${x}" y="472" font-size="20" font-family="${escAttr(font)}" fill="${theme.gateTextInactive}">${escAttr(date)}</text>`);
  }
  PLANET_ORDER.forEach((planet, i) => {
    const g = gates?.[planet];
    const y = 510 + i * 44;
    parts.push(`<text x="${x}" y="${y}" font-size="26" font-family="${escAttr(font)}" fill="${theme.gateTextInactive}">${PLANET_GLYPHS[planet]}</text>`);
    parts.push(`<text x="${x + 38}" y="${y}" font-size="26" font-weight="600" font-family="${escAttr(font)}" ` +
      `fill="${color}">${g ? `${g.gate}.${g.line}` : '—'}</text>`);
  });
  parts.push('</g>');
  return parts.join('');
}

function svgLabel(chart) {
  return [
    'Human Design bodygraph.',
    chart.type?.name ? `Type: ${chart.type.name}.` : '',
    chart.profile?.numbers ? `Profile ${chart.profile.numbers}.` : '',
    chart.authority?.name ? `${chart.authority.name}.` : ''
  ].filter(Boolean).join(' ');
}

/**
 * Render a 1200×630 social/share card (OpenGraph size): bodygraph on the
 * left, identity summary on the right. Same purity guarantees as
 * renderBodygraphSVG — rasterize with any SVG renderer (resvg, sharp,
 * a browser) to produce og:image PNGs.
 *
 * @param {object} chart - calculateHumanDesign() result
 * @param {object} [opts]
 * @param {string} [opts.name] - person's name for the headline
 * @param {('light'|'dark')} [opts.theme='light']
 * @param {string} [opts.footer='openhumandesign.com'] - set '' to hide
 * @param {string} [opts.fontFamily='Inter, system-ui, sans-serif']
 */
export function renderChartCardSVG(chart, opts = {}) {
  const dark = opts.theme === 'dark';
  const bg = dark ? '#141210' : '#faf8f5';
  const cardBg = dark ? '#1e1c18' : '#ffffff';
  const text = dark ? '#e8e4de' : '#1a1714';
  const subtext = dark ? '#9e978e' : '#6b6560';
  const accent = dark ? '#d4943a' : '#9a5e1c';
  const font = opts.fontFamily || 'Inter, system-ui, sans-serif';

  const TYPE_COLORS = {
    'Generator': '#b98e2f',
    'Manifesting Generator': '#c96f1e',
    'Manifestor': '#b3422f',
    'Projector': '#2471a3',
    'Reflector': '#6c7a7b'
  };
  const typeColor = TYPE_COLORS[chart.type?.name] || text;

  const graph = renderBodygraphSVG(chart, { theme: opts.theme, gateNumbers: false, fontFamily: font })
    // strip outer svg tag, keep inner content for embedding
    .replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

  const name = opts.name ? escAttr(opts.name) : '';
  const footer = opts.footer === undefined ? 'openhumandesign.com' : opts.footer;

  const lines = [
    chart.profile?.numbers ? `${chart.profile.numbers} ${chart.profile.name || ''}`.trim() : '',
    chart.authority?.name || '',
    chart.definition || ''
  ].filter(Boolean);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="${bg}"/>
  <rect x="40" y="40" width="370" height="550" rx="18" fill="${cardBg}"/>
  <g transform="translate(75, 60) scale(0.345)">${graph}</g>
  <g font-family="${escAttr(font)}">
    ${name ? `<text x="470" y="170" font-size="40" fill="${subtext}">${name}</text>` : ''}
    <text x="470" y="${name ? 248 : 220}" font-size="68" font-weight="700" fill="${typeColor}">${escAttr(chart.type?.name || 'Human Design')}</text>
    ${lines.map((l, i) => `<text x="470" y="${(name ? 318 : 290) + i * 54}" font-size="34" fill="${text}">${escAttr(l)}</text>`).join('\n    ')}
    ${chart.incarnationCross?.name ? `<text x="470" y="${(name ? 318 : 290) + lines.length * 54 + 14}" font-size="26" fill="${subtext}">Cross of ${escAttr(chart.incarnationCross.name.replace(/^The /, ''))}</text>` : ''}
    ${footer ? `<text x="470" y="560" font-size="28" font-weight="600" fill="${accent}">${escAttr(footer)}</text>` : ''}
  </g>
</svg>`;
}

/**
 * Render a vertical share card for Stories / Reels / TikTok (1080×1920) or a
 * square post (1080×1080): identity at the top, bodygraph centered as the hero,
 * branding at the bottom. Same purity guarantees as renderChartCardSVG —
 * rasterize with resvg / sharp / a browser for a downloadable PNG.
 *
 * @param {object} chart - calculateHumanDesign() result
 * @param {object} [opts]
 * @param {string} [opts.name]
 * @param {('story'|'square')} [opts.format='story']
 * @param {('light'|'dark')} [opts.theme='light']
 * @param {string} [opts.footer='openhumandesign.com'] - set '' to hide
 * @param {string} [opts.fontFamily='Inter, system-ui, sans-serif']
 */
export function renderStoryCardSVG(chart, opts = {}) {
  const dark = opts.theme === 'dark';
  const bg = dark ? '#141210' : '#faf8f5';
  const text = dark ? '#e8e4de' : '#1a1714';
  const subtext = dark ? '#9e978e' : '#6b6560';
  const accent = dark ? '#d4943a' : '#9a5e1c';
  const font = opts.fontFamily || 'Inter, system-ui, sans-serif';

  const TYPE_COLORS = {
    'Generator': '#b98e2f',
    'Manifesting Generator': '#c96f1e',
    'Manifestor': '#b3422f',
    'Projector': '#2471a3',
    'Reflector': '#6c7a7b'
  };
  const typeColor = TYPE_COLORS[chart.type?.name] || text;

  const square = opts.format === 'square';
  const W = 1080;
  const H = square ? 1080 : 1920;

  // Render the bodygraph, read its viewBox so we can fit it precisely.
  const full = renderBodygraphSVG(chart, { theme: opts.theme, gateNumbers: false, fontFamily: font });
  const vbMatch = full.match(/viewBox="([^"]+)"/);
  const [vx, vy, vw, vh] = (vbMatch ? vbMatch[1] : '0 0 300 340').split(/\s+/).map(Number);
  const graph = full.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

  const name = opts.name ? escAttr(opts.name) : '';
  const footer = opts.footer === undefined ? 'openhumandesign.com' : opts.footer;
  const lines = [
    chart.profile?.numbers ? `${chart.profile.numbers} ${chart.profile.name || ''}`.trim() : '',
    chart.authority?.name || '',
    chart.definition || ''
  ].filter(Boolean);

  const cx = W / 2;
  let y = square ? 92 : 150;
  const header = [];
  if (name) { header.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-size="46" fill="${subtext}">${name}</text>`); y += square ? 80 : 104; }
  header.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-size="${square ? 76 : 92}" font-weight="700" fill="${typeColor}">${escAttr(chart.type?.name || 'Human Design')}</text>`);
  y += square ? 66 : 84;
  for (const l of lines) { header.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-size="40" fill="${text}">${escAttr(l)}</text>`); y += 56; }

  // Fit the bodygraph within the space between the header and the footer,
  // constrained by BOTH width and available height so it never overlaps.
  const footY = H - (square ? 64 : 116);
  const crossY = footY - 52;
  const graphTop = y + (square ? 14 : 44);
  const avail = (crossY - 34) - graphTop;
  const maxW = square ? 740 : 940;
  const scale = Math.min(maxW / vw, avail / vh);
  const gW = vw * scale;
  const tx = (W - gW) / 2 - vx * scale;
  const ty = graphTop - vy * scale;
  const cross = chart.incarnationCross?.name
    ? `<text x="${cx}" y="${crossY}" text-anchor="middle" font-size="32" fill="${subtext}">Cross of ${escAttr(chart.incarnationCross.name.replace(/^The /, ''))}</text>` : '';
  const brand = footer
    ? `<text x="${cx}" y="${footY}" text-anchor="middle" font-size="36" font-weight="600" fill="${accent}">${escAttr(footer)}</text>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <g font-family="${escAttr(font)}">${header.join('')}</g>
  <g transform="translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) scale(${scale.toFixed(4)})">${graph}</g>
  <g font-family="${escAttr(font)}">${cross}${brand}</g>
</svg>`;
}

export default renderBodygraphSVG;
