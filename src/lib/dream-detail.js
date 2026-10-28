/**
 * Sleep-chart detail sheets.
 *
 * Reuses the shared dialog lifecycle, navigable structure and navigation
 * headings, but owns its activation data *and* its reading text. The waking
 * detail path in views/chart.js reads that module's own current chart, so
 * reusing it here would answer a question about the sleeping design with the
 * waking chart's activations; AGENTS.md §6 requires the data context to be
 * explicit instead.
 *
 * Each sheet carries one layer only. The gate, channel and six-line sheets print
 * the dream reading from the teacher's material (`lib/dream-vocabulary.js`) and
 * nothing else: waking prose belongs to the waking chart and is not mixed in
 * here, where it would read as dream content. The one place the waking side is
 * shown on purpose is the type sheet (`showType('waking')`), which the type
 * strip's own `Awake` button opens; it receives the waking type name from this
 * person's sleep model instead of reading the loaded chart, and it is titled as
 * the waking reading so the two never blur.
 *
 * Object titles are the sleep vocabulary's: a gate is titled with
 * `dreamGateName()`, a channel with `dreamChannelName()`, and the night field
 * (plus portal) follows as a secondary tag. The waking name is not printed at
 * all, so the sheet cannot present the waking catalogue as the dream object.
 *
 * Composite (two-person) mode swaps the three-source activation block for
 * ownership, using the same gateOwner/channelDynamic the shared renderer already
 * exposes, so no second colour vocabulary is invented here.
 */

import { openDetailDialog, closeDetailDialog, prepareDetailDialog, fitDetailSheetHeight } from './detail-dialog.js';
import { renderDetailNavigation } from './object-detail-heading.js';
import { bindSharedObjectDetails } from './shared-object-details.js';
import { DREAM_CHANNELS, dreamRealmOf, isDreamPortal } from './human-design/dream-topology.js';
import { GATES } from './human-design/catalog.js';
import {
  dreamGateName, dreamLineTheme, dreamRealmName, dreamTypeName, dreamTypeReading,
  dreamGateReading, dreamChannelName, dreamChannelReading, dreamChannelDefinition,
  dreamPortalReading, dreamLineReading, dreamPlanetReading
} from './dream-vocabulary.js';
import {
  centerName, planetName, typeName as wakingTypeName, typeDescription, strategy, notSelf, signature
} from './vocabulary.js';
import { PLANET_GLYPHS } from './planet-reference.js';
import { t, formatDisplay } from './i18n.js';
import { esc } from './format.js';

/**
 * The three activation sources of a single sleep design, in display order.
 *
 * The personality side is the sleeping person's own instant, not a waking
 * chart, so it is named with the sleep vocabulary (`Sleep personality` →
 * 梦境人格) and never as "awake personality". `DreamChart` uses the same two keys
 * for its composite row groups, which keeps one label per side on every page.
 */
const SOURCES = [
  { key: 'personality', label: 'Sleep personality' },
  { key: 'design', label: 'Sleep design' },
  // Shared UI key, so the sheet and the page name the overlay the same way.
  { key: 'transit', label: 'Transit' }
];

/**
 * The transit term as the rest of the app names it. One key owns it
 * (the locale files' ui-transits.json, key `"Transit"`), so renaming it there renames it
 * here too instead of leaving the sleep chart on an older word.
 */
const transitTerm = () => t('Transit');

const gateCenter = gate => GATES[gate]?.center;

/**
 * The sleep wording for the four channel states `channelSource()` returns.
 * `TRANSIT_SOURCE_LABELS` says "Birth chart", which is the waking chart's own
 * claim; the same four structural states in a sleep design are described here.
 */
const SLEEP_CHANNEL_STATUS = {
  natal: 'Complete in the sleep design',
  completed: 'Completed by {transit}',
  transit: '{transit} only',
  inactive: 'Not complete in the sleep design'
};
const bothStatus = complete => complete ? 'Complete across both sleep designs' : 'Not complete across both sleep designs';

const chip = (source, gate) => `<span class="dream-planet-chip"><i aria-hidden="true">${PLANET_GLYPHS[source.planet] || ''}</i>${esc(planetName(source.planet))} ${gate}.${source.line}</span>`;

function sourceRows(activations, gate) {
  const rows = SOURCES
    .map(({ key, label }) => ({ key, label, list: activations[key] || [] }))
    .filter(row => row.list.length);
  if (!rows.length) return `<p class="dream-detail-empty">${esc(t('No activation in the sleep design.'))}</p>`;
  return `<div class="dream-detail-sources">${rows.map(row => `
    <div class="dream-detail-source dream-detail-source-${row.key}">
      <span class="dream-detail-source-label">${esc(t(row.label))}</span>
      <span class="dream-detail-source-planets">${row.list.map(item => chip(item, gate)).join('')}</span>
    </div>`).join('')}</div>`;
}

/** Lines that are live in this sleep design, across all three sources. */
function activeLines(activations) {
  const lines = new Set();
  for (const { key } of SOURCES) for (const item of activations[key] || []) if (item.line) lines.add(item.line);
  return [...lines].sort((a, b) => a - b);
}

function lineThemeRow(lines) {
  if (!lines.length) return '';
  return `<div class="dream-detail-lines">${lines.map(line =>
    `<span class="dream-detail-line"><span class="dream-detail-line-no">${esc(t('Line {line}', { line }))}</span>
      <span class="dream-detail-line-theme">${esc(dreamLineTheme(line))}</span></span>`).join('')}</div>`;
}

/**
 * The night field, then the portal mark: both are facts *about* the dream gate,
 * so they sit under its dream title instead of repeating it. The gate's own name
 * is the sheet's title and is deliberately not repeated here.
 */
function dreamTags(gate) {
  const realm = dreamRealmOf(gate);
  return `<div class="dream-detail-tags">
    ${realm ? `<span class="dream-detail-tag dream-detail-tag-${realm}">${esc(dreamRealmName(realm))}</span>` : ''}
    ${isDreamPortal(gate) ? `<span class="dream-detail-tag dream-detail-tag-portal">${esc(t('Portal'))}</span>` : ''}
  </div>`;
}

/** The sleep title of a gate, in the shared heading classes the other sheets use. */
function dreamGateHeading(gate) {
  return `<div class="detail-label">${esc(t('Gate {gate}', { gate }))}</div>
    <div class="detail-name">${esc(dreamGateName(gate))}</div>`;
}

/**
 * The sleep title of a channel: label + dream name, and nothing else.
 *
 * The waking catalogue's circuit badges are deliberately not printed here: a
 * circuit belongs to the waking system's explanation of the channel, and this
 * sheet answers what the channel does at night by the teacher's own material.
 * Mixing the two would re-import the layer §1.6 keeps out of these sheets.
 */
function dreamChannelHeading(channel) {
  const key = channel.gates.join('-');
  return `<div class="detail-label">${esc(t('Channel {channel}', { channel: key }))}</div>
    <div class="detail-name dream-detail-channel-title">${esc(dreamChannelName(channel.gates) || key)}</div>`;
}

/**
 * The sleep title of a centre.
 *
 * A centre's only identifier is its name — there is no number or gate pair to put
 * in an eyebrow, as "Gate 19" or "Channel 1-8" does on the other sheets — so this
 * heading is the shared `.detail-name` alone rather than "Center / Throat Center".
 */
function centerHeading(key) {
  return `<div class="detail-name">${esc(centerName(key))}</div>`;
}

/**
 * A reading block with the two labels that keep dream and waking prose apart.
 *
 * The sheet shows both, so every block says which one it is before it says
 * anything else; a reader can never mistake the waking reading for the dream one.
 *
 * @param {string} kind - `dream` or `waking`, drives the accent class
 * @param {string} title - already-translated heading
 * @param {string} body - markup, escaped by the caller
 */
function readingSection(kind, title, body, attrs = {}) {
  if (!body) return '';
  const extra = Object.entries(attrs)
    .map(([name, value]) => ` ${name}="${esc(value)}"`).join('');
  return `<section class="dream-reading dream-reading-${kind}" data-dream-reading="${kind}"${extra}>
      <h3 class="dream-reading-title">${esc(title)}</h3>
      ${body}
    </section>`;
}

/** One labelled paragraph of a reading object; a null field renders nothing. */
const readingRow = (label, value) => value
  ? `<p class="dream-reading-row"><span class="dream-reading-label">${esc(label)}</span>${esc(value)}</p>`
  : '';

/** `gate` body: what the teacher's material says this dream gate does at night. */
function gateDreamReading(gate) {
  const text = dreamGateReading(gate);
  if (!text) return '';
  return readingSection('dream', t('Dream gate reading'), `<p class="dream-reading-prose">${esc(text)}</p>`);
}

/**
 * The six night forces, one shared set for every dream gate, with the lines this
 * sleep design actually activates marked.
 *
 * The material pairs each line's waking role with its dream mechanism and its
 * residue in one entry. Only the dream half belongs in this sheet: the waking
 * role describes the waking chart, and mixing it in would read as dream content
 * (the source text itself is unchanged: the waking field stays in the locale
 * vocabulary, it is simply not printed here). The line's
 * dream mechanism and the residue are both about the night, so both stay.
 */
function nightForceSection(lines) {
  const rows = [1, 2, 3, 4, 5, 6].map(line => {
    const reading = dreamLineReading(line);
    if (!reading) return '';
    const active = lines.includes(line);
    return `<li class="dream-nightforce${active ? ' dream-nightforce-active' : ''}" data-line="${line}"${active ? ' data-active-line="true"' : ''}>
        <div class="dream-nightforce-head">
          <span class="dream-nightforce-no">${esc(t('Line {line}', { line }))}</span>
          <span class="dream-nightforce-theme">${esc(dreamLineTheme(line))}</span>
          ${active ? `<span class="dream-nightforce-badge">${esc(t('Active tonight'))}</span>` : ''}
        </div>
        ${readingRow(t('Dream state'), reading.dream)}
        ${readingRow(t('Conditioning residue'), reading.residue)}
      </li>`;
  }).filter(Boolean).join('');
  if (!rows) return '';
  return readingSection('dream', t('Night forces of the six lines'),
    `<p class="dream-reading-note">${esc(t('These six descriptions apply to every dream gate; the line, not the gate, decides which one applies.'))}</p>
     <ol class="dream-nightforce-list">${rows}</ol>`);
}

/**
 * `channel` body: the dream channel's night function, then its fixed or
 * conditioned reading.
 *
 * This split is the core of the teaching. `natal` (the channel is complete in the
 * sleeper's own design) reads the fixed case; `transit` and `completed` (the night
 * sky fills it in) read the conditioned one, and so does a composite channel built
 * from one gate per person, because neither design carries it alone. The residue
 * follows both, because both leave one.
 *
 * `inactive` renders the night function only: there is nothing to read as fixed or
 * conditioned in a channel that is not complete.
 *
 * @param {string} id - `"a-b"` channel key
 * @param {string} source - `natal` / `completed` / `transit` / `inactive`
 */
function channelDreamReading(id, source) {
  const reading = dreamChannelReading(id);
  if (!reading) return '';
  const fixed = source === 'natal';
  const caseText = source === 'inactive' ? null : fixed ? reading.fixed : reading.conditioning;
  const caseRule = source === 'inactive' ? null : dreamChannelDefinition(fixed ? 'fixed' : 'conditioning');
  const body = [
    reading.dream ? `<p class="dream-reading-prose">${esc(reading.dream)}</p>` : '',
    caseRule ? `<p class="dream-reading-note" data-dream-channel-rule="${fixed ? 'fixed' : 'conditioning'}">${esc(caseRule)}</p>` : '',
    caseText ? `<p class="dream-reading-prose dream-reading-case" data-dream-channel-text="${fixed ? 'fixed' : 'conditioning'}">${esc(caseText)}</p>` : '',
    readingRow(t('Conditioning residue'), reading.residue)
  ].join('');
  const title = source === 'inactive' ? t('Dream channel reading')
    : fixed ? t('Fixed dream landscape') : t('Night conditioning');
  // The case is marked on the section, not only on the paragraph: the material
  // gives a per-channel example for some channels and not others, and the reader
  // still has to be able to tell which of the two cases is theirs.
  return readingSection('dream', title, body,
    source === 'inactive' ? {} : { 'data-dream-channel-case': fixed ? 'fixed' : 'conditioning' });
}

/** Planet chips are the sheet's way into one planet's dream reading. */
function planetReadings(sources) {
  const seen = new Set();
  const blocks = [];
  for (const source of sources) {
    if (seen.has(source.planet)) continue;
    seen.add(source.planet);
    const reading = dreamPlanetReading(source.planet);
    if (!reading) continue;
    const body = [
      reading.mechanics ? `<p class="dream-reading-prose">${esc(reading.mechanics)}</p>` : '',
      readingRow(t('In the dream'), reading.dream),
      readingRow(t('Conditioning residue'), reading.residue)
    ].join('');
    blocks.push(`<details class="dream-planet-reading" data-planet="${esc(source.planet)}">
        <summary><i aria-hidden="true">${PLANET_GLYPHS[source.planet] || ''}</i>${esc(planetName(source.planet))}
          ${reading.role ? `<span class="dream-planet-role">${esc(reading.role)}</span>` : ''}</summary>
        ${body}
      </details>`);
  }
  if (!blocks.length) return '';
  return `<div class="dream-planet-readings" data-dream-planet-readings>${blocks.join('')}</div>`;
}

/**
 * One controller per sleep-chart render. The host owns the element's placement;
 * this module owns its content, its navigation state and its data context.
 *
 * @param {object} options
 * @param {object} options.dream - computeDreamChart() result (or null in composite mode)
 * @param {object} [options.model] - buildDreamTransitGraph() result, when the night sky is overlaid
 * @param {object} [options.composite] - { labelA, labelB } when two sleep designs share one graph
 * @param {object} [options.a] - person A's dream model, composite mode only
 * @param {object} [options.b] - person B's dream model, composite mode only
 */
export function createDreamDetail(initial = {}) {
  const element = document.createElement('div');
  element.id = 'dream-detail';
  element.className = 'gate-detail hidden';

  // The data context is replaceable: a language or skin redraw hands this same
  // controller the new model instead of building a second sheet, so the element
  // the dialog owns stays in the document and the open card survives.
  let data = { dream: null, model: null, composite: null, a: null, b: null, ...initial };
  let api = null;
  let current = null;
  // Selections the reader moved through, so the sheet's Back reaches the card
  // they came from instead of being a button that does nothing.
  const history = [];

  const activationsFor = gate => ({
    personality: data.dream?.gates.byNumber.personality.get(gate) || [],
    design: data.dream?.gates.byNumber.design.get(gate) || [],
    transit: data.dream?.gates.byNumber.transit.get(gate) || []
  });

  /** Composite mode has no night sky; both sleep designs contribute lines. */
  const compositeLinesFor = gate => {
    const lines = new Set();
    for (const item of [data.a, data.b]) {
      if (!item) continue;
      for (const side of ['personality', 'design']) {
        for (const act of item.gates.byNumber[side].get(gate) || []) lines.add(act.line);
      }
    }
    return [...lines].sort((x, y) => x - y);
  };

  function paint(html, selection) {
    prepareDetailDialog(element, 'dream');
    element.innerHTML = html;
    element.classList.remove('hidden');
    // Only a gate, channel or centre exists in the graph. The type sheets are page
    // entries with no geometry, so pinning them would ask the renderer for an
    // object it does not have; they clear the pin instead of inventing one.
    if (selection?.kind === 'type') api?.setPinned?.(null);
    else api?.setPinned?.(selection);
    bindSharedObjectDetails(element, {
      onGateSelect: gate => showGate(gate),
      onChannelSelect: id => showChannel(id),
      onBack: back
    });
    openDetailDialog(element, () => {
      // Closing ends the current step as well as its trail: a later sheet must not
      // inherit the closed one's selection, or its first step would render a Back
      // button into a sheet the reader never came from.
      history.length = 0;
      current = null;
      api?.setPinned?.(null);
    }, { owner: 'dream', label: t('Sleep chart details') });
    // The shared sheet sizes itself to the phone viewport; a card that skipped
    // this would overflow under the nav bar on a narrow screen.
    fitDetailSheetHeight(element.querySelector('.dream-detail-card'));
  }

  /** Reopen the previous selection without pushing it back onto the stack. */
  function back() {
    const previous = history.pop();
    if (!previous) return;
    if (previous.kind === 'gate') showGate(previous.id, false);
    else if (previous.kind === 'channel') showChannel(previous.id, false);
    else if (previous.kind === 'type') showType(previous.id, previous.owner ?? null, false);
    else showCenter(previous.id, false);
  }

  function card(attrs, body) {
    return `<div class="gate-detail-card dream-detail-card" ${attrs}>
      <div class="gate-detail-nav">${renderDetailNavigation({ canGoBack: history.length > 0 })}</div>
      <div class="gate-detail-body">${body}</div>
    </div>`;
  }

  /** Record where a step came from, unless it is the same selection again. */
  function advance(selection) {
    const same = current && current.kind === selection.kind && current.id === selection.id
      && (current.owner ?? null) === (selection.owner ?? null);
    if (current && !same) history.push(current);
    current = selection;
  }

  function showGate(gate, push = true) {
    if (push) advance({ kind: 'gate', id: gate }); else current = { kind: 'gate', id: gate };
    const lines = data.composite ? compositeLinesFor(gate) : activeLines(activationsFor(gate));
    // In composite mode the ownership block below already lists every channel
    // this gate completes, with the relationship dynamic; a second list driven by
    // `channelSource()` would describe the same channel as "not complete".
    const channels = data.composite ? [] : DREAM_CHANNELS.filter(channel => channel.gates.includes(gate));
    const channelBlock = channels.length ? `
      <h3 class="dream-detail-subhead">${esc(t('Dream channels of this gate'))}</h3>
      <div class="dream-detail-channels">${channels.map(channel => {
        const id = channel.gates.join('-');
        const source = data.model ? data.model.channelSource(channel)
          : data.dream?.channels.some(c => c.gates.join('-') === id) ? 'natal' : 'inactive';
        return `<button type="button" class="dream-detail-channel ${source}" data-shared-channel-select="${id}">
          <span class="dream-detail-channel-id">${esc(id)}</span>
          <span class="dream-detail-channel-name">${esc(dreamChannelName(channel.gates) || id)}</span>
          <span class="circuit-badge transit-source-badge ${source}">${esc(t(SLEEP_CHANNEL_STATUS[source], { transit: transitTerm() }))}</span>
        </button>`;
      }).join('')}</div>` : '';

    const body = data.composite
      ? compositeGateBody(gate)
      : `${dreamTags(gate)}
         ${sourceRows(activationsFor(gate), gate)}
         ${lineThemeRow(lines)}`;

    // The planets that carry this gate sit next to the activation rows that name
    // them: one block, before the six-line reading, instead of after it. The six
    // lines are universal (every gate shares them), so they belong at the end of
    // the sheet where a reader who wants the line detail goes, not between the
    // gate's own activations and its prose.
    const planets = data.composite
      ? [data.a, data.b].flatMap(item => item ? ['personality', 'design'].flatMap(side => item.gates.byNumber[side].get(gate) || []) : [])
      : SOURCES.flatMap(({ key }) => activationsFor(gate)[key] || []);
    const planetBlock = planets.length
      ? `<h3 class="dream-detail-subhead">${esc(t('Planets in this gate'))}</h3>${planetReadings(planets)}`
      : '';

    // Every block below is the dream reading: the gate's own, the portal's
    // two stages, and the six night forces. The waking chart's gate reading is
    // not printed in this sheet at all — it describes a different object.
    const dreamReading = [
      gateDreamReading(gate),
      // A portal's own two-stage reading belongs with its gate too: the night-field
      // plaque is collapsed by default, and a reader who opened the portal from the
      // graph should not have to go back to the page to read it.
      isDreamPortal(gate)
        ? readingSection('dream', t('What this portal does'), renderDreamPortalReading(gate))
        : '',
      nightForceSection(lines)
    ].join('');

    paint(card(`data-gate="${gate}"`, `
      ${dreamGateHeading(gate)}
      ${body}
      ${planetBlock}
      ${dreamReading ? `<div class="dream-readings" data-dream-readings>${dreamReading}</div>` : ''}
      ${channelBlock}
    `), { kind: 'gate', id: gate });
  }

  function compositeGateBody(gate) {
    const owner = api?.gateOwner?.(gate);
    const who = owner === 'both' ? `${data.composite.labelA} + ${data.composite.labelB}`
      : owner === 'a' ? data.composite.labelA
        : owner === 'b' ? data.composite.labelB : t('Neither of you');
    const channels = DREAM_CHANNELS.filter(channel => channel.gates.includes(gate));
    const rows = channels.map(channel => {
      const dynamic = api?.channelDynamic?.(channel);
      if (!dynamic) return '';
      return `<div class="dream-detail-channel ${dynamic}">
        <span class="dream-detail-channel-id">${esc(channel.gates.join('-'))}</span>
        <span class="dream-detail-channel-name">${esc(dreamChannelName(channel.gates) || channel.gates.join('-'))}</span>
        <span class="dream-detail-channel-dyn">${esc(t(COMPOSITE_DYNAMIC_LABELS[dynamic] || dynamic))}</span>
      </div>`;
    }).filter(Boolean).join('');
    return `${dreamTags(gate)}
      <div class="dream-detail-owner">${esc(t('Carried by'))} <strong>${esc(who)}</strong></div>
      ${rows || `<p class="dream-detail-empty">${esc(t('This gate doesn’t complete a channel between you.'))}</p>`}
      ${compositeTypeRow()}`;
  }

  function compositeTypeRow() {
    const row = (label, item) => item ? `<span class="dream-detail-fact">${esc(label)} ${esc(dreamTypeName(item.type.id))}</span>` : '';
    return `<div class="dream-detail-facts">
      ${row(data.composite.labelA, data.a)}${row(data.composite.labelB, data.b)}
    </div>`;
  }

  function showChannel(id, push = true) {
    const channel = DREAM_CHANNELS.find(item => item.gates.join('-') === id);
    if (!channel) return;
    const key = channel.gates.join('-');
    if (push) advance({ kind: 'channel', id: key }); else current = { kind: 'channel', id: key };
    // `channelSource()` describes the gates it is given, so a channel with one natal
    // gate and one gate nobody carries would read as "completed" there. Completeness
    // is decided first, exactly as the page's channel rows decide it.
    const complete = data.model
      ? data.model.channels.some(item => item.gates.join('-') === key)
      : !!data.dream?.channels.some(item => item.gates.join('-') === key);
    const source = !complete ? 'inactive' : data.model ? data.model.channelSource(channel) : 'natal';
    const statusLabel = data.composite ? bothStatus(source !== 'inactive') : SLEEP_CHANNEL_STATUS[source];
    // Which reading the channel gets. `natal` means the sleeper already carries the
    // channel, so it is a fixed dream landscape. Anything completed from outside —
    // the night sky, the bed partner, or (in the two-person composite) one gate
    // from each person — is conditioning, and the teaching calls that the damaging
    // case. A composite channel one person completes alone is still that person's
    // own fixed landscape.
    const dynamic = data.composite ? api?.channelDynamic?.(channel) : null;
    const caseSource = data.composite
      // One gate from each person is the only composite case where neither design
      // carries the channel on its own, so it reads as sky-completed (`completed`):
      // the pair's own conditioning, not anybody's fixed landscape.
      ? (dynamic === 'electromagnetic' ? 'completed' : dynamic ? 'natal' : 'inactive')
      : source;
    const gateRows = channel.gates.map(gate => {
      if (data.composite) {
        const owner = api?.gateOwner?.(gate);
        const who = owner === 'both' ? `${data.composite.labelA} + ${data.composite.labelB}`
          : owner === 'a' ? data.composite.labelA : owner === 'b' ? data.composite.labelB : t('Neither of you');
        return `<div class="dream-detail-gate-row">
          <button type="button" class="dream-detail-gate-link" data-shared-gate-select="${gate}">
            <span class="dream-detail-gate-id">${gate}</span>
            <span class="dream-detail-gate-name">${esc(dreamGateName(gate))}</span>
          </button>
          <span class="dream-detail-gate-owner">${esc(who)}</span>
        </div>`;
      }
      const acts = activationsFor(gate);
      return `<div class="dream-detail-gate-row">
        <button type="button" class="dream-detail-gate-link" data-shared-gate-select="${gate}">
          <span class="dream-detail-gate-id">${gate}</span>
          <span class="dream-detail-gate-name">${esc(dreamGateName(gate))}</span>
        </button>
        ${SOURCES.filter(({ key: k }) => acts[k]?.length).map(({ key: k, label }) =>
          // The gate is the row's own: `gatesByNumber` entries carry
          // `{ planet, line }` and no gate, so numbering them from the item
          // rendered "undefined.3". `chip()` above takes the gate as a parameter
          // for the same reason.
          `<span class="dream-detail-gate-src dream-detail-source-${k}">${esc(t(label))} ${acts[k].map(item => `${gate}.${item.line}`).join(' ')}</span>`).join('')}
      </div>`;
    }).join('');

    paint(card(`data-channel="${key}"`, `
      ${dreamChannelHeading(channel)}
      <span class="circuit-badge transit-source-badge ${source}">${esc(t(statusLabel, { transit: transitTerm() }))}</span>
      <div class="dream-detail-centers">${esc(formatDisplay('channelCenters', channel.centers, channel.centers.map(centerName)))}</div>
      ${gateRows}
      ${channelDreamReading(key, caseSource)}
    `), { kind: 'channel', id: key });
  }

  /**
   * One of the two types in a comparison, opened from its own entry.
   *
   * Single design: `showType('waking')` / `showType('dream')` reads this person's
   * model. Composite: the same sheet is reachable per person, so `owner` (`'a'` /
   * `'b'`) picks whose sleep design it describes and the label names them — a
   * two-person page must never answer "which type" with one person's name and the
   * other person's reading.
   *
   * The waking side reads the type name from the model the page handed this sheet
   * (`wakingType.name`), never from the loaded chart: that is the same
   * explicit-context rule the activations follow (AGENTS.md §6). Its prose is the
   * shared plain description the waking chart already shows, printed under the
   * waking heading so the two readings can never be mistaken for one another.
   *
   * @param {'waking'|'dream'} side
   * @param {'a'|'b'|null} [owner] - whose model, in composite mode
   * @param {boolean} [push] - record the step in the sheet's own history
   */
  function showType(side, owner = null, push = true) {
    if (side !== 'waking' && side !== 'dream') return;
    const owned = owner === 'a' || owner === 'b';
    const model = owned ? (owner === 'a' ? data.a : data.b) : data.dream;
    if (!model || (owned && !data.composite)) return;
    const selection = { kind: 'type', id: side, owner: owned ? owner : null };
    if (push) advance(selection); else current = selection;
    const wakingName = model.wakingType?.name || null;
    const sleepId = model.type?.id || null;
    const name = side === 'waking'
      ? (wakingName ? wakingTypeName(wakingName) : '—')
      : (sleepId ? dreamTypeName(sleepId) : '—');
    // The site's own label separator, as `activationColumn()` composes its heading:
    // one joining rule for a composed label, no private one here. The person's name
    // sits in its own span because `.detail-label` is uppercased and a person's name
    // is data, not chrome.
    const ownerLabel = owned ? (owner === 'a' ? data.composite.labelA : data.composite.labelB) : null;
    const ownerSpan = ownerLabel
      ? `<span class="dream-detail-label-owner">${esc(formatDisplay('separator', 'label') + ownerLabel)}</span>`
      : '';
    const body = side === 'waking' ? wakingTypeSheet(wakingName) : dreamTypeSheet(sleepId);
    paint(card(`data-type="${side}"${owned ? ` data-owner="${owner}"` : ''}`, `
      <div class="detail-label">${esc(t(side === 'waking' ? 'Awake' : 'Asleep'))}${ownerSpan}</div>
      <div class="detail-name">${esc(name)}</div>
      ${body}
    `), selection);
  }

  function showCenter(key, push = true) {
    if (push) advance({ kind: 'center', id: key }); else current = { kind: 'center', id: key };
    if (data.composite) {
      const owner = api?.centerOwner?.(key);
      const tag = owner === 'both' ? t('Both define') : owner === 'a' ? t('{name} defines', { name: data.composite.labelA })
        : owner === 'b' ? t('{name} defines', { name: data.composite.labelB })
          : owner === 'bridged' ? t('Newly defined in the relationship') : t('Undefined');
      paint(card(`data-center="${key}"`, `
        ${centerHeading(key)}
        <div class="dream-detail-owner">${esc(tag)}</div>
        ${compositeTypeRow()}
      `), { kind: 'center', id: key });
      return;
    }
    const defined = data.dream.centers.defined.has(key);
    const gates = (data.dream?.gates.all || []).filter(gate => gateCenter(gate) === key);
    const gateList = gates.length
      ? `<div class="dream-detail-center-gates">${gates.map(gate => `
          <button type="button" class="dream-detail-gate-link" data-shared-gate-select="${gate}">
            <span class="dream-detail-gate-id">${gate}</span>
            <span class="dream-detail-gate-name">${esc(dreamGateName(gate))}</span>
            <span class="dream-detail-tag dream-detail-tag-${dreamRealmOf(gate)}">${esc(dreamRealmName(dreamRealmOf(gate)))}</span>
          </button>`).join('')}</div>`
      : `<p class="dream-detail-empty">${esc(t('No dream gate is active in this center.'))}</p>`;
    paint(card(`data-center="${key}"`, `
      ${centerHeading(key)}
      <span class="circuit-badge transit-source-badge ${defined ? 'natal' : 'inactive'}">${esc(t(defined ? 'Defined in sleep' : 'Undefined in sleep'))}</span>
      <h3 class="dream-detail-subhead">${esc(t('Dream gates in this center'))}</h3>
      ${gateList}
    `), { kind: 'center', id: key });
  }

  /**
   * Language and skin changes redraw the open sheet from the same context.
   *
   * A type sheet belongs to a model, not to a mode: when the page hands this sheet
   * a composite (or leaves one), the type that was open no longer describes what is
   * on screen, so it is closed instead of redrawn against the other person's data.
   */
  function refresh() {
    if (!current || element.classList.contains('hidden')) return;
    if (current.kind === 'gate') showGate(current.id, false);
    else if (current.kind === 'channel') showChannel(current.id, false);
    else if (current.kind === 'type') {
      const owned = current.owner === 'a' || current.owner === 'b';
      const available = owned ? (data.composite && (current.owner === 'a' ? data.a : data.b)) : data.dream;
      if (!available) closeDetailDialog();
      else showType(current.id, current.owner ?? null, false);
    } else showCenter(current.id, false);
  }

  return {
    element,
    setApi: next => { api = next; },
    /** Hand a redraw's model and graph API to this same sheet. */
    update: (next = {}) => {
      data = { ...data, ...next };
      if (next.api !== undefined) api = next.api;
    },
    showGate, showChannel, showCenter, showType, refresh,
    close: () => closeDetailDialog(),
    /** Whether this controller currently owns an open card. */
    get open() { return !!current && !element.classList.contains('hidden'); }
  };
}

const COMPOSITE_DYNAMIC_LABELS = {
  electromagnetic: 'Electromagnetic',
  companionship: 'Companionship',
  compromise: 'Compromise',
  dominance: 'Dominance'
};

/**
 * One sleep type's reading, in the teacher's own five parts.
 *
 * The only renderer of a sleep-type reading: the sheet calls it directly, so a
 * collapsed variant no longer exists on the page — an entry opens the card instead
 * of unfolding prose in place. The parts keep the material's own headings
 * (机械定义 / 形成条件 / 清醒 vs 睡眠反差 / 运作状态 / 核心现象), so a mechanical definition is
 * never mistaken for a description of how the night feels.
 *
 * @param {string} typeId - reflector / generator / projector / manifestor / manifestingGenerator
 * @returns {string} a `<dl>` of parts, or '' when the source does not cover this type
 */
export function renderDreamTypeReadingBody(typeId) {
  const reading = dreamTypeReading(typeId);
  if (!reading) return '';
  const parts = [
    [t('Mechanical definition'), reading.mechanical],
    [t('Formation condition'), reading.condition],
    [t('Waking vs sleep contrast'), reading.contrast],
    [t('Operating state'), reading.operating],
    [t('Core phenomenon'), reading.phenomenon]
  ].filter(([, value]) => value);
  if (!parts.length) return '';
  const body = parts.map(([label, value]) =>
    `<div class="dream-type-reading-part"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('');
  return `<dl class="dream-type-reading-parts" data-dream-type-reading-body="${esc(typeId)}">${body}</dl>`;
}

/**
 * The sheet's dream half of the type comparison.
 *
 * @param {string|null} typeId
 * @returns {string} markup, or '' when this sleep design has no type reading
 */
function dreamTypeSheet(typeId) {
  const body = typeId ? renderDreamTypeReadingBody(typeId) : '';
  if (!body) return '';
  return readingSection('dream', t('How this sleep type works'), body);
}

/**
 * The sheet's waking half of the type comparison.
 *
 * The type name arrives from the caller (this person's waking type, read from the
 * sleep model), so the sheet answers for that person and never for whatever chart
 * happens to be loaded. The facts and the description are the shared waking
 * vocabulary's: no dream wording is added here, and no waking prose is added to
 * the gate, channel or line sheets.
 *
 * @param {string|null} name - the waking type's display name, e.g. `Generator`
 * @returns {string} markup, or '' when the name is unknown
 */
function wakingTypeSheet(name) {
  if (!name) return '';
  const facts = [
    ['Strategy:', strategy(name)],
    ['Signature:', signature(name)],
    ['Not-Self:', notSelf(name)]
  ].filter(([, value]) => value)
    .map(([label, value]) => `<span class="dream-fact">${esc(t(label))} ${esc(value)}</span>`).join('');
  const prose = typeDescription(name);
  return `${facts ? `<div class="dream-type-facts" data-waking-type-facts>${facts}</div>` : ''}
    ${readingSection('waking', t('Waking chart reading'),
    prose ? `<p class="dream-reading-prose">${esc(prose)}</p>` : '', { 'data-waking-type-reading': 'true' })}`;
}

/**
 * A portal's two stages: what it collects at night, and what bleeds into the Ajna
 * or the Solar Plexus in the morning.
 *
 * Exported for the same reason as the type reading: the night-field panel shows it
 * under the portal plaque, and the gate sheet shows it for the portal gate.
 */
export function renderDreamPortalReading(gate) {
  const reading = dreamPortalReading(gate);
  if (!reading) return '';
  const target = reading.target
    ? `<p class="dream-reading-row"><span class="dream-reading-label">${esc(t('Overflows into'))}</span>${esc(reading.target)}</p>`
    : '';
  return `<div class="dream-portal-reading" data-dream-portal-reading="${gate}">
      ${readingRow(t('What it collects at night'), reading.night)}
      ${target}
      ${readingRow(t('Morning bleed-through'), reading.morning)}
    </div>`;
}
