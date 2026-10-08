import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SKINS, SKIN_TOKENS, SKIN_TOKEN_GROUPS, getTransitSourceMode, CENTER_PALETTE_TOKENS, PLANNED_SKIN_DIRECTIONS } from '../src/lib/skin-registry.js';
import { t, setLocale } from '../src/lib/i18n.js';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const approved = JSON.parse(read('tests/fixtures/skin-presets-approved.json'));
const skinScope = JSON.parse(read('tests/fixtures/skin-reviewed-scope.json'));
const skinScopeFile = file => Object.hasOwn(skinScope.files, file);
const values = css => Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
const luminance = hex => {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return rgb.map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((s, x, i) => s + x * [.2126, .7152, .0722][i], 0);
};
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);

test('per-Skin source strategy is registry data with split fallback and complete source tokens', () => {
  assert.equal(SKIN_TOKEN_GROUPS.sources.length, 14);
  assert.equal(SKIN_TOKENS.length, 102);
  assert.deepEqual(SKINS.slice(0,2).map(s=>s.defaultCenterPalette), ['classic','mineral']);
  assert.deepEqual(SKINS.filter(s => s.transitSourceMode === 'unified-natal').map(s => s.id), ['delve']);
  for (const s of SKINS) {
    assert.ok(['split','unified-natal'].includes(s.transitSourceMode));
    assert.equal(getTransitSourceMode(s.id),s.transitSourceMode);
  }
  assert.equal(getTransitSourceMode('future-or-invalid-id'), 'split');
  assert.doesNotMatch(read('src/bodygraph.js') + read('src/features/transit-timeline/graph-window.js'), /['"]delve['"]/);
});

test('all nine presets have their own complete token stylesheet and exact approved primary palettes', () => {
  assert.equal(SKINS.length, 11);
  assert.equal(new Set(SKINS.map(s => s.id)).size, 11);
  assert.deepEqual(PLANNED_SKIN_DIRECTIONS, []);
  assert.deepEqual(SKINS.slice(0,2).map(s=>s.defaultCenterPalette), ['classic','mineral']);
  for (const fixture of approved) {
    const skin = SKINS.find(s => s.id === fixture.id);
    const css = read(skin.cssSource), tokens = values(css);
    assert.equal(skin.mode, fixture.id === 'midnight-contrast' ? 'dark' : 'light');
    assert.ok(css.includes(`:root[data-skin="${skin.id}"]`));
    assert.equal(SKIN_TOKENS.filter(t => tokens[t]).length, ['delve','absolutely','midnight-contrast','coral'].includes(skin.id) ? 102 : 100, skin.id);
    for (const token of CENTER_PALETTE_TOKENS) assert.equal(tokens[token], undefined);
    assert.doesNotMatch(css, /font-|color-mix|url\(/, skin.id);
    for (const [key, value] of Object.entries(fixture.site)) {
      const token = ({ elevated: 'bg-elevated', sunken: 'bg-sunken', success: 'status-success', danger: 'status-error' })[key] || key;
      if (!['coral', 'shadow-base'].includes(key)) assert.equal(tokens['--' + token], value, skin.id + ' ' + key);
    }
    assert.equal(skin.transitSourceMode, fixture.transitSourceMode);
    assert.equal(tokens['--hd-overlay-natal'], fixture.overlayNatal.color);
    assert.equal(tokens['--hd-overlay-natal-on'], fixture.overlayNatal.on);
    for (const [key, value] of Object.entries(fixture.signal)) assert.equal(tokens['--hd-transit-' + key], value, skin.id + ' Signal ' + key);
    const relationshipStateTokens = ['electromagnetic','companionship','compromise','dominance'];
    for (const [keys, colors, prefix] of [
      [['personality', 'design', 'transit', 'both', 'inactive'], fixture.sources, '--hd-'],

      [['generator', 'manifesting-generator', 'manifestor', 'projector', 'reflector'], fixture.types, '--hd-type-'],
      [['individual', 'tribal', 'collective', 'integration'], fixture.circuits, '--hd-circuit-'],
      [['a', 'b', 'bridged'], fixture.relationships.slice(0, 3), '--hd-connection-'],
      [relationshipStateTokens, relationshipStateTokens.map(key=>tokens[`--hd-relationship-${key}`]), '--hd-relationship-']
    ]) keys.forEach((key, i) => assert.equal(tokens[prefix + key], colors[i], skin.id + ' ' + key));
    for (const [key, expected] of Object.entries({electromagnetic:'var(--hd-connection-bridged)',companionship:'var(--hd-connection-both)',compromise:'var(--hd-connection-a)',dominance:'var(--hd-connection-a)'})) assert.equal(tokens[`--hd-relationship-${key}`], expected);
    const relationshipFixture = fixture.id === 'high-contrast' ? ['#91B3C4','#D8A39D','#C5B984']
      : fixture.id === 'grass-aroma' ? ['#91BFAE','#D8A795','#BFC18A']
      : fixture.id === 'delve' ? ['#3F3F3F','#2E75D4','#AAB0B6'] : fixture.relationships.slice(0,3);
    assert.deepEqual(['a','b','bridged'].map(key=>tokens[`--hd-connection-${key}`]), relationshipFixture, skin.id+' approved Relationship base colors');
    if (skin.id === 'delve') for (const [key, value] of Object.entries({'--hd-birth-personality':'#1A1A1A','--hd-birth-design':'#2E75D4'})) assert.equal(tokens[key], value, skin.id+' approved four-arrow birth source');
    for (const [key, expected] of Object.entries({electromagnetic:'var(--hd-connection-bridged)',companionship:'var(--hd-connection-both)',compromise:'var(--hd-connection-a)',dominance:'var(--hd-connection-a)'})) assert.equal(tokens[`--hd-relationship-${key}`], expected);
    ['individual','tribal','collective','integration'].forEach((key,i)=>assert.equal(tokens[`--hd-circuit-${key}-soft`],fixture.circuitSofts[i]));
    assert.equal(tokens['--hd-connection-both'], 'repeating-linear-gradient(45deg, var(--hd-connection-a) 0 6px, var(--hd-connection-b) 6px 12px)');
    for (const [key, token] of Object.entries({surface:'--bg',text:'--text',accent:'--accent',personality:'--hd-personality',design:'--hd-design',transit:'--hd-transit'})) assert.equal(skin.preview[key], tokens[token]);
  }
});

test('all source foregrounds and Transit text meet 4.5 contrast; relationship Both remains readable', () => {
  for (const skin of SKINS.slice(2)) {
    const tokens = values(read(skin.cssSource));
    for (const source of ['personality', 'design', 'transit', 'both', 'inactive', 'overlay-natal']) {
      assert.ok(contrast(tokens[`--hd-${source}`], tokens[`--hd-${source}-on`]) >= 4.5, skin.id + ' ' + source + ' on');
    }
    assert.ok(contrast(tokens['--hd-transit-text'], tokens['--bg']) >= 4.5, skin.id + ' transit text');
    assert.ok(contrast(tokens['--hd-timeline-transit'], tokens['--hd-transit-on']) >= 4.5, skin.id + ' timeline foreground');
    for (const source of ['a', 'b', 'bridged']) assert.ok(contrast(tokens[`--hd-connection-${source}`], tokens[`--hd-connection-${source}-on`]) >= 4.5, skin.id + ' relationship ' + source);
    const backgrounds = ['a', 'b'].map(source => tokens[`--hd-connection-${source}`]);
    // The shared foreground must work against both ownership colors.
    const bestShared = Math.max(...['#000000', '#FFFFFF'].map(on => Math.min(...backgrounds.map(bg => contrast(bg, on)))));
    for (const bg of backgrounds) assert.ok(contrast(bg, tokens['--hd-connection-both-on']) >= Math.min(4.5, bestShared) - 1e-9, skin.id + ' Both on ' + bg);
  }
});

test('only New Warm Paper changes a limited geometry surface; base typography remains untouched', () => {
  for (const skin of SKINS.slice(2)) {
    const css = read(skin.cssSource), tokens = values(css);
    assert.doesNotMatch(css, /font-family|font-size|line-height|letter-spacing/);
    if (skin.id === 'new-warm-paper') {
      assert.equal(tokens['--radius'], '2px'); assert.equal(tokens['--radius-lg'], '3px');
      assert.equal(tokens['--skin-large-radius'], '6px'); assert.equal(tokens['--skin-border-width'], '.5px');
      assert.match(css, /\.skin-settings/);
    } else assert.doesNotMatch(css, /border-radius|border-width|--radius|--skin-large/);
  }
  assert.doesNotMatch(read('src/lib/skin-registry.js'), /font-family|fontSize|fontChoice/);
});

test('Picker names and section labels use existing three-language messages without exposing IDs', () => {
  const cn = ['琥珀晨光','琥珀暮色','素白','草香','沉思','Absolutely','随时准备接住你','用户彻底怒了','新暖纸','青夜·高对比','珊瑚'];
  const hant = ['琥珀晨光','琥珀暮色','素白','草香','沉思','Absolutely','隨時準備接住你','用戶徹底怒了','新暖紙','青夜·高對比','珊瑚'];
  for (const [locale, names] of [['zh-CN', cn], ['zh-Hant', hant], ['en', SKINS.map(s => s.name)]]) {
    setLocale(locale, {persist:false}); SKINS.forEach((s,i) => assert.equal(t(s.name), names[i]));
    for (const key of ['Appearance','Skin','Center Palette','Customize','Restore Current Skin']) assert.ok(t(key));
  }
  setLocale('en', {persist:false});
  assert.doesNotMatch(read('index.html') + read('src/lib/appearance-controls.js'), /data-skin-preset/);
  assert.doesNotMatch(read('index.html'), /data-center-palette=/);
  assert.match(read('src/lib/appearance-controls.js'), /SKINS\.filter\(skin => !\['default-light', 'default-dark'\]\.includes\(skin\.id\)\)/);
  assert.match(read('src/lib/appearance-controls.js'), /setSkinDefaultCenterPalette/);
  assert.match(read('src/lib/appearance-controls.js'), /setAutoSkin/);
});


test('Timeline Signal has no fixed bluegray anchor; cursor and birth keep their own semantics', () => {
  const css = read('src/features/transit-timeline/timeline.css');
  assert.match(css, /--tl-transit:\s*var\(--hd-timeline-transit\);/);
  assert.match(css, /--tl-transit-ink:\s*var\(--hd-transit-on\);/);
  assert.match(css, /--tl-cursor-color:\s*var\(--accent-strong\);/);
  assert.doesNotMatch(css, /#445457/);
  assert.match(css, /--tl-birth:\s*var\(--hd-timeline-birth\);/);
});

test('V3 preserves V2 surfaces except approved Delve structure/status colors, and protects layout/storage/centers/algorithms', () => {
  const baseline = JSON.parse(read('tests/fixtures/skin-palette-v3-boundaries.json'));
  for (const fixture of approved) {
    const tokens = values(read(SKINS.find(s => s.id === fixture.id).cssSource));
    for (const [key, value] of Object.entries(baseline.site[fixture.id])) {
      const expected = baseline.approvedSiteChanges?.[fixture.id]?.[key] ?? value;
      assert.equal(tokens[key], expected, fixture.id + ' keeps approved site ' + key);
    }
  }
  for (const [path, hash] of Object.entries(baseline.files)) {
    if (skinScopeFile(path)) continue;
    const integratedScope = JSON.parse(read('docs/connection-structure-phase1-scope.json'));
    assert.equal(createHash('sha256').update(read(path)).digest('hex'), integratedScope.files[path] ?? hash, path + ' preserves its approved algorithm or integrated relationship contract');
  }
});


test('Delve uses black structure, Azure BodyGraph and deep-blue Timeline; birth and other semantics stay intact', () => {
  const boundary = JSON.parse(read('tests/fixtures/skin-palette-v3-boundaries.json'));
  const baseline = boundary.delveAzureBaseline;
  const skin = SKINS.find(s => s.id === 'delve');
  const tokens = values(read(skin.cssSource));
  const currentChanges = Object.fromEntries(Object.entries(tokens).filter(([key, value]) => baseline.tokens[key] !== value));
  const approvedChanges = { ...baseline.changes, ...boundary.delveSemanticChanges.changes,
    '--hd-timeline-both-birth':'#343434',
    '--hd-birth-personality':'#1A1A1A','--hd-birth-design':'#2E75D4',
    '--hd-electromagnetic':'#806B53','--hd-timeline-both-transit':'#1F4F85','--hd-timeline-both-on':'#FFFFFF',
    '--hd-timeline-transit':'#1F4F85','--hd-timeline-birth':'#343434',
    '--hd-circuit-individual':'#7A2F99','--hd-circuit-individual-soft':'#F0E6F6',
    '--hd-circuit-tribal':'#A82E24','--hd-circuit-tribal-soft':'#FCE4E4',
    '--hd-circuit-collective':'#1C6695','--hd-circuit-collective-soft':'#E4F0FC',
    '--hd-circuit-integration':'#18773F','--hd-circuit-integration-soft':'#E4F6EC',
    '--hd-connection-a':'#3F3F3F','--hd-connection-a-core':'var(--hd-connection-a)',
    '--hd-connection-b':'#2E75D4','--hd-connection-b-core':'var(--hd-connection-b)','--hd-connection-b-on':'#FFFFFF',
    '--hd-connection-both':'repeating-linear-gradient(45deg, var(--hd-connection-a) 0 6px, var(--hd-connection-b) 6px 12px)','--hd-connection-both-on':'#FFFFFF',
    '--hd-connection-bridged':'#AAB0B6','--hd-connection-bridged-core':'var(--hd-connection-bridged)','--hd-connection-bridged-on':'#111111',
    '--hd-relationship-electromagnetic':'var(--hd-connection-bridged)','--hd-relationship-companionship':'var(--hd-connection-both)',
    '--hd-relationship-compromise':'var(--hd-connection-a)','--hd-relationship-dominance':'var(--hd-connection-a)'};
  approvedChanges['--hd-timeline-birth']='#343434';
  for (const [token, value] of Object.entries(approvedChanges)) {
    if (token === '--accent-hover') assert.equal(tokens[token], '#000000', 'approved black Delve hover');
    else if (token === '--accent-soft') assert.equal(tokens[token], 'rgba(0,0,0,0.05)', 'approved black Delve soft accent');
    else if (token === '--hd-birth-personality' || token === '--hd-birth-design') assert.equal(tokens[token], value, 'approved Delve token '+token);
    else if (token in baseline.tokens) assert.equal(tokens[token], value, 'approved Delve token '+token);
  }
  for (const token of Object.keys(currentChanges)) assert.ok(Object.hasOwn(approvedChanges, token), 'Delve change is explicitly approved: '+token);
  assert.ok(Object.keys(currentChanges).every(token => Object.hasOwn(approvedChanges, token)), 'Delve has no unreviewed palette token changes');
  assert.equal(skin.transitSourceMode, 'unified-natal');
  assert.deepEqual(skin.preview, {surface:'#FFFFFF',text:'#1A1A1A',accent:'#111111',personality:'#1A1A1A',design:'#6F6F6F',transit:'#2E75D4',signature:'#2E75D4'});
  assert.ok(contrast(tokens['--hd-transit'],tokens['--hd-transit-on']) >= 4.5);
  assert.equal(tokens['--hd-electromagnetic'], '#806B53');
  assert.ok(contrast(tokens['--accent'],tokens['--accent-on']) >= 4.5);
  // Remove only explicitly approved additions before checking old boundaries.
  for (const [path,hash] of Object.entries(baseline.files)) {
    if (skinScopeFile(path)) continue;
    let css = read(path);
    if (path === 'src/styles/skins/deep-think.css') {
      css = css.replace(/^  --(?:status-info|status-info-soft|status-caution|hd-timeline-transit):[^\n]+\n/gm, '');
    }
    if (path.endsWith('/timeline.css')) css = css.replace('--tl-transit: var(--hd-timeline-transit);', '--tl-transit: var(--hd-transit);');
    assert.equal(createHash('sha256').update(css).digest('hex'),hash,path+' unchanged beyond approved semantics');
  }
});

test('all Skins own independent info/caution colors and Skin-owned Timeline signal', () => {
  for (const skin of SKINS) {
    const css = read(skin.cssSource);
    const blocks = [...css.matchAll(/\{([^{}]+)\}/g)].map(m => values(m[1]));
    const tokens = skin.id === 'default-light' ? {...blocks[0], ...blocks[2]} : skin.id === 'default-dark' ? {...blocks[0], ...blocks[2], ...blocks[1], ...blocks[3]} : values(css);
    const birthDefaults = {
      'default-light': ['#282624','#B84D43'], 'default-dark': ['#E9E4DD','#E16F60'],
      'high-contrast': ['#202428','#B84A44'], 'grass-aroma': ['#344039','#B76A58'],
      'contemplation': ['#313740','#A16872'], 'deep-think': ['#252A36','#C26068'],
      'new-warm-paper': ['#2A2622','#8B2C1F']
    };
    for (const token of SKIN_TOKENS) {
      const birthIndex = token === '--hd-birth-personality' ? 0 : token === '--hd-birth-design' ? 1 : -1;
      const expected = birthIndex < 0 ? null : birthDefaults[skin.id]?.[birthIndex];
      if (expected) assert.equal(tokens[token] ?? tokens[birthIndex === 0 ? '--hd-personality' : '--hd-design'], expected, skin.id+' inherited/explicit birth token');
      else assert.ok(tokens[token], skin.id+' '+token);
    }
    for (const token of ['--status-info','--status-info-soft','--status-caution']) assert.match(tokens[token], /^#[0-9a-f]{6}$/i, skin.id + ' independent ' + token);
    if (skin.id === 'default-light') assert.equal(tokens['--hd-timeline-transit'], '#2F6870');
    else if (skin.id === 'default-dark') assert.equal(tokens['--hd-timeline-transit'], '#3F7C82');
    else assert.equal(tokens['--hd-timeline-transit'], approved.find(f => f.id === skin.id)?.timelineTransit ?? tokens['--hd-transit']);
  }
  const css = read('src/styles.css'), renderer = read('src/views/chart.js');
  assert.doesNotMatch(css + renderer, /reliability-soft/);
  for (const [state,token] of [['solid','success'],['info','info'],['caution','caution']]) {
    assert.ok(css.includes(`.reliability-${state} { background: var(--status-${token}-soft); }`));
    assert.ok(css.includes(`.reliability-${state} .reliability-dot { background: var(--status-${token}); }`));
  }
});
