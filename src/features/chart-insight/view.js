/**
 * Chart insight view — right-column dashboard rendering.
 *
 * Renders overview and level-2 detail into a host element using normal document
 * flow. It owns no chart state: the caller passes the model plus callbacks for
 * detail navigation, left-graph hover and knowledge reads.
 *
 * Overview is a metric list, not a card wall: one row per metric with a label, a
 * figure and a 4px distribution strip. The 64-cell gate map lives in level 2; the
 * overview only shows the activated gates as a compact strip.
 */
import { t, getLocale } from '../../lib/i18n.js';
import {
  typeName, strategy, signature, notSelf, authorityName, profileName,
  definitionName, centerName, channelName, circuitGroupName, circuitName,
  planetName, gateName, variable, cognition
} from '../../lib/vocabulary.js';
import { activationSourceReference } from '../../lib/planet-reference.js';
import { quarterForGate } from '../../lib/quarter.js';
import { geneKeyTerm, crossName, contentText } from '../../lib/content.js';
import { PLANET_GLYPHS } from '../../bodygraph.js';
import { esc } from '../../lib/format.js';

/** Gate map columns follow the host width, never the viewport. */
export function gateColumns(hostWidth) {
  if (!hostWidth) return 8;
  return hostWidth < 380 ? 6 : 8;
}

const groupColorVar = group => `var(--${group})`;
const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** One status sentence at most, with the full text behind a disclosure. */
function statusNote(meta) {
  if (!meta) return '';
  if (meta.timeUnknown) {
    return `<div class="ci-note" data-tone="caution"><span class="ci-note-short">${esc(t('No birth time — this chart is a best guess using noon. Your Type, Authority and Profile can change with the real time.'))}</span></div>`;
  }
  if (!meta.reliabilityShort) return '';
  return `<div class="ci-note" data-tone="solid">
    <span class="ci-note-short">${esc(meta.reliabilityShort)}</span>
    ${meta.reliabilityDetail ? `<details class="ci-note-detail"><summary>${esc(t('Show more'))}</summary><p>${esc(meta.reliabilityDetail)}</p></details>` : ''}
  </div>`;
}

function identityChips(model) {
  const { identity } = model;
  const chips = [
    { kind: 'type', label: typeName(identity.typeName ?? ''), read: 'type' },
    { kind: 'definition', label: definitionName(identity.definition ?? ''), read: 'definition' },
    { kind: 'profile', label: `${identity.profileNumbers ?? ''} ${profileName(identity.profileNumbers ?? '')}`.trim(), read: 'profile' },
    { kind: 'authority', label: authorityName(identity.authorityName ?? ''), read: 'authority' }
  ];
  return chips.map(chip => `
    <button type="button" class="ci-chip" data-ci-read="${chip.read}">
      <span class="ci-chip-label">${esc(chip.label)}</span>
    </button>`).join('');
}

function strategyBlock(model) {
  const { identity } = model;
  return `
    <div class="ci-strategy">
      <span class="ci-strategy-value">${esc(strategy(identity.typeName ?? ''))}</span>
      <span class="ci-strategy-facts">
        <span><em>${esc(t('Signature'))}</em> ${esc(signature(identity.typeName ?? ''))}</span>
        <span><em>${esc(t('Not-Self'))}</em> ${esc(notSelf(identity.typeName ?? ''))}</span>
      </span>
      <button type="button" class="ci-link" data-ci-read="strategy">${esc(t('Read strategy'))}</button>
    </div>`;
}

/**
 * Overview gate summary.
 *
 * The first screen shows one honest figure — activated gates out of the 64 — with
 * real design / personality / both counts. The full 64-cell map stays in level 2;
 * tiling every activated gate here made the first screen unreadable.
 */
function gateMetric(model) {
  const { totals } = model;
  return metricRow({
    id: 'gates',
    label: 'Activated gates',
    figure: totals.activeGates,
    of: 64,
    segments: [
      { id: 'design', count: totals.designGates, label: 'Design' },
      { id: 'personality', count: totals.personalityGates, label: 'Personality' },
      { id: 'both', count: totals.bothGates, label: 'Both' }
    ],
    note: `${esc(t('Design'))} ${totals.designGates} · ${esc(t('Personality'))} ${totals.personalityGates} · ${esc(t('Both'))} ${totals.bothGates}`,
    open: 'gates'
  });
}

/** A 4px distribution strip: real counts, no scoring or gauges. */
function strip(segments) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const visible = segments.filter(segment => segment.count > 0);
  if (!total || !visible.length) return '<span class="ci-dist" aria-hidden="true"></span>';
  return `<span class="ci-dist" role="img" aria-label="${esc(visible.map(s => `${t(s.label)} ${s.count}`).join(', '))}">${visible.map(segment =>
    `<i data-state="${segment.id}" style="--ci-share:${(segment.count / total) * 100}%" title="${esc(t(segment.label))} ${segment.count}"></i>`).join('')}</span>`;
}

/** One metric row: label, figure, distribution, drill. */
function metricRow({ id, label, figure, of = null, segments = null, note = null, open = null }) {
  const tag = open ? 'button' : 'div';
  const attrs = open ? `type="button" data-ci-open="${open}"` : '';
  return `
    <${tag} class="ci-metric" ${attrs}>
      <span class="ci-metric-label">${esc(t(label))}</span>
      <span class="ci-metric-figure">${figure}${of ? `<span class="ci-metric-of">/${of}</span>` : ''}</span>
      ${segments ? strip(segments) : ''}
      ${note ? `<span class="ci-metric-note">${note}</span>` : ''}
    </${tag}>`;
}

function centerMetric(model) {
  const { centers } = model;
  return metricRow({
    id: 'centers',
    label: 'Defined centres',
    figure: centers.definedCount,
    of: 9,
    segments: [
      { id: 'defined', count: centers.definedCount, label: 'Defined' },
      { id: 'undefined', count: centers.undefinedCount, label: 'Undefined' },
      { id: 'open', count: centers.openCount, label: 'Open' }
    ],
    note: `${centers.undefinedCount} ${esc(t('Undefined'))} · ${centers.openCount} ${esc(t('Open'))}`,
    open: 'centers'
  });
}

function circuitMetric(model) {
  const complete = model.circuits.reduce((sum, circuit) => sum + circuit.complete, 0);
  const total = model.circuits.reduce((sum, circuit) => sum + circuit.total, 0);
  return metricRow({
    id: 'circuits',
    label: 'Complete channels',
    figure: complete,
    of: total,
    segments: model.circuits.map(circuit => ({
      id: circuit.group,
      count: circuit.complete,
      label: circuitGroupName(circuit.group)
    })),
    note: model.circuits.map(circuit => `<span class="ci-metric-note-item"><b>${circuit.complete}</b> ${esc(circuitGroupName(circuit.group))}</span>`).join(''),
    open: 'circuits'
  });
}

/**
 * Planet summary: real activation positions, split by side.
 *
 * Thirteen positions exist per side and a normal chart fills every one, so a
 * 26/26 fraction carries no information and its strip would always be full. The
 * row reports the real counts without inventing a comparison.
 */
function planetMetric(model) {
  const { planets } = model;
  return metricRow({
    id: 'planets',
    label: 'Planets',
    figure: planets.designCount + planets.personalityCount,
    of: null,
    note: `<span class="ci-metric-note-item">${esc(t('Design'))} <b>${planets.designCount}</b>/${planets.totalPlanets}</span><span class="ci-metric-note-item">${esc(t('Personality'))} <b>${planets.personalityCount}</b>/${planets.totalPlanets}</span>`,
    open: 'planets'
  });
}

/**
 * Variable summary: four real direction symbols, each with its own side.
 *
 * The previous version counted left and right against a 4/4 total, which read as a
 * score. Direction is not a fraction: each arrow is simply left or right.
 */
function variableMetric(model) {
  const arrows = model.variable.arrows;
  const symbol = direction => direction === 'left' ? '◀' : direction === 'right' ? '▶' : '·';
  return metricRow({
    id: 'variable',
    label: 'Variable',
    figure: arrows.map(arrow => `<b class="ci-var-dir" data-side="${arrow.side}" data-direction="${arrow.direction ?? ''}">${symbol(arrow.direction)}</b>`).join(''),
    of: null,
    note: arrows.map(arrow => `<span class="ci-metric-note-item">${esc(t(variableKindLabel(arrow.kind)))} <span class="ci-var-side">${esc(t(arrow.side === 'design' ? 'Design' : 'Personality'))}</span></span>`).join(''),
    open: 'variable'
  });
}

function variableKindLabel(kind) {
  return kind === 'determination' ? 'Determination' : kind === 'environment' ? 'Environment'
    : kind === 'motivation' ? 'Motivation' : 'Perspective';
}

/** Cross summary: the real translated name plus its four gates, not a 4/4 count. */
function crossMetric(model) {
  const { cross } = model;
  const gates = cross.gates.length
    ? cross.gates.map(gate => `<b class="ci-cross-gate-figure">${gate}</b>`).join('<span aria-hidden="true">/</span>')
    : '—';
  return metricRow({
    id: 'cross',
    label: 'Incarnation Cross',
    figure: gates,
    of: null,
    note: `<span class="ci-metric-name">${esc(cross.name ?? '—')}</span>`,
    open: 'cross'
  });
}

/** Overview: identity, one status sentence, gate summary, five metric rows. */
export function renderOverview(model, { meta = null } = {}) {
  return `
    <div class="ci-overview">
      <header class="ci-head">
        <h2 class="ci-title">${esc(t('Chart insight'))}</h2>
        ${statusNote(meta)}
      </header>
      <section class="ci-identity" aria-label="${esc(t('Identity'))}">
        <div class="ci-chips">${identityChips(model)}</div>
        ${strategyBlock(model)}
      </section>
      <div class="ci-metrics">
        ${gateMetric(model)}
        ${centerMetric(model)}
        ${circuitMetric(model)}
        ${planetMetric(model)}
        ${variableMetric(model)}
        ${crossMetric(model)}
      </div>
    </div>`;
}

function breadcrumb(title) {
  return `
    <nav class="ci-crumbs" aria-label="${esc(t('Chart insight'))}">
      <button type="button" class="ci-back" data-ci-back="overview">${esc(t('Back to overview'))}</button>
      <span class="ci-crumb-sep" aria-hidden="true">/</span>
      <span class="ci-crumb-current">${esc(t(title))}</span>
    </nav>`;
}

function channelItem(channel) {
  return `
    <li class="ci-channel" data-status="${channel.status}" data-group="${channel.group}">
      <button type="button" class="ci-channel-main" data-ci-channel="${channel.key}">
        <span class="ci-channel-gates">${channel.gates.map(gate => `<i data-ci-gate-inline="${gate}">${gate}</i>`).join('<span aria-hidden="true">–</span>')}</span>
        <span class="ci-channel-name">${esc(channelName(channel.gates))}</span>
      </button>
      <span class="ci-channel-meta">
        <span class="ci-badge" data-group="${channel.group}">${esc(circuitGroupName(channel.group))}</span>
        <span class="ci-badge" data-subcircuit="1">${esc(circuitName(channel.subcircuit))}</span>
        <span class="ci-badge" data-status="${channel.status}">${esc(t(channel.status === 'complete' ? 'Complete' : channel.status === 'single' ? 'Single' : 'Inactive'))}</span>
      </span>
    </li>`;
}

function channelsList(channels) {
  if (!channels.length) return `<p class="ci-empty">${esc(t('No channels match this filter.'))}</p>`;
  return `<ul class="ci-channel-list">${channels.map(channelItem).join('')}</ul>`;
}

/** Level 2: circuit groups with subcircuit filters and channel candidates. */
export function renderCircuits(model, { status = 'active', subcircuit = 'all' } = {}) {
  const statusFilters = [
    ['active', 'Show active only'],
    ['complete', 'Complete only'],
    ['single', 'Single-ended only'],
    ['all', 'Show all']
  ].map(([id, label]) => `
    <button type="button" class="ci-filter" data-ci-status="${id}" aria-pressed="${id === status}">${esc(t(label))}</button>`).join('');
  const groups = model.circuits.map(circuit => {
    const subs = circuit.subcircuits.map(sub => `
      <button type="button" class="ci-sub" data-ci-subcircuit="${sub.id}" aria-pressed="${subcircuit === sub.id}">
        <span class="ci-sub-name">${esc(circuitName(sub.id))}</span>
        <span class="ci-sub-count">${sub.complete}/${sub.total}</span>
        <span class="ci-sub-single">${sub.single}</span>
      </button>`).join('');
    const channels = model.channels.filter(channel => {
      if (channel.group !== circuit.group) return false;
      if (subcircuit !== 'all' && channel.subcircuit !== subcircuit) return false;
      if (status === 'complete') return channel.status === 'complete';
      if (status === 'single') return channel.status === 'single';
      if (status === 'all') return true;
      return channel.status !== 'inactive';
    });
    return `
      <section class="ci-group" data-group="${circuit.group}" style="--ci-circuit:${groupColorVar(circuit.group)}">
        <header class="ci-group-head">
          <h3>${esc(circuitGroupName(circuit.group))}</h3>
          <span class="ci-group-figure">${circuit.complete}<span class="ci-metric-of">/${circuit.total}</span></span>
          <span class="ci-group-note">${esc(t('Complete'))} ${circuit.complete} · ${esc(t('Single'))} ${circuit.single} · ${esc(t('Shown'))} ${channels.length}</span>
        </header>
        <div class="ci-subs">${subs}</div>
        ${channelsList(channels)}
      </section>`;
  }).join('');
  const completeTotal = model.channels.filter(c => c.status === 'complete').length;
  const singleTotal = model.channels.filter(c => c.status === 'single').length;
  return `
    ${breadcrumb('Circuits')}
    <div class="ci-detail" data-ci-detail="circuits">
      <div class="ci-filters" role="group" aria-label="${esc(t('Filters'))}">
        ${statusFilters}
        <button type="button" class="ci-filter" data-ci-subcircuit="all" aria-pressed="${subcircuit === 'all'}">${esc(t('All sources'))}</button>
      </div>
      <p class="ci-count">${esc(t('{complete} complete · {single} single-ended · {total} channels in total', { complete: completeTotal, single: singleTotal, total: model.channels.length }))}</p>
      ${groups}
    </div>`;
}

/**
 * Fixing label for a natal state. `calculateLineFixings` returns five states:
 * exalted, detriment, juxtaposed (both poles at once), none (a rule exists but no
 * pole applies) and unknown (missing rule or incomplete input). `none` is a real
 * neutral result and is shown as Neutral; it is never conflated with unknown.
 */
function fixingLabel(state) {
  if (state === 'exalted') return t('Exalted');
  if (state === 'detriment') return t('Detriment');
  if (state === 'juxtaposed') return t('Exalted and Detriment');
  if (state === 'none') return t('Neutral');
  if (state === 'unknown') return t('Unknown');
  return '';
}

/** Level 2: both planet tables with c.t.b substructure, dates and fixing. */
export function renderPlanets(model, { fixings = null } = {}) {
  const row = ({ planet, side, activation }) => {
    const state = fixings?.[side]?.[planet]?.natalState ?? null;
    const label = fixingLabel(state);
    if (!activation?.gate) {
      return `<tr class="ci-planet-row" data-empty="1"><th scope="row">${esc(planetName(planet))}</th><td>—</td><td></td><td>—</td></tr>`;
    }
    const substructure = ['color', 'tone', 'base'].every(key => Number.isFinite(activation[key]))
      ? `${activation.color}.${activation.tone}.${activation.base}` : '';
    return `<tr class="ci-planet-row">
      <th scope="row"><span class="ci-planet-glyph" aria-hidden="true">${PLANET_GLYPHS[planet] ?? ''}</span>${esc(planetName(planet))}</th>
      <td><button type="button" class="ci-activation" data-ci-planet="${planet}" data-side="${side}" data-gate="${activation.gate}" data-line="${activation.line ?? ''}">${activation.gate}.${activation.line ?? ''}</button></td>
      <td class="ci-ctb">${esc(substructure)}</td>
      <td>${label ? `<span class="ci-fixing" data-state="${state}">${esc(label)}</span>` : ''}</td>
    </tr>`;
  };
  const table = side => `
    <table class="ci-planet-table" data-side="${side}">
      <caption>${esc(t(side === 'design' ? 'Design' : 'Personality'))} · ${model.planets[`${side}Count`]}/${model.planets.totalPlanets}${model.planets[`${side}Date`] ? ` · ${esc(model.planets[`${side}Date`])}` : ''}</caption>
      <thead><tr><th scope="col">${esc(t('Planets'))}</th><th scope="col">${esc(t('Active'))}</th><th scope="col">c.t.b</th><th scope="col">${esc(t('Fixing'))}</th></tr></thead>
      <tbody>${model.planets.planets.map(entry => row({ planet: entry.planet, side, activation: entry[side] })).join('')}</tbody>
    </table>`;
  return `
    ${breadcrumb('Planets')}
    <div class="ci-detail" data-ci-detail="planets">
      <p class="ci-count">${esc(t('Each planet activates a gate and line. Design was calculated about 88 days before birth.'))}</p>
      <p class="ci-count">${esc(activationSourceReference('design', getLocale()))} ${esc(activationSourceReference('personality', getLocale()))}</p>
      <div class="ci-tables">${table('design')}${table('personality')}</div>
      <p class="ci-count">${esc(t('Select any planet to read its role.'))}</p>
    </div>`;
}

export function renderCenters(model) {
  const items = model.centers.centers.map(center => `
    <li class="ci-center" data-state="${center.status}">
      <span class="ci-center-name">${esc(centerName(center.center))}</span>
      <span class="ci-badge" data-status="${center.status}">${esc(t(center.status === 'defined' ? 'Defined' : center.status === 'open' ? 'Open' : 'Undefined'))}</span>
      <button type="button" class="ci-link" data-ci-center="${center.center}">${esc(t('Read centre reading'))}</button>
    </li>`).join('');
  return `
    ${breadcrumb('Centers')}
    <div class="ci-detail" data-ci-detail="centers">
      <p class="ci-count">${model.centers.definedCount}/9 ${esc(t('Defined centres'))} · ${model.centers.openCount} ${esc(t('Open'))} · ${model.centers.undefinedCount} ${esc(t('Undefined'))}</p>
      <ul class="ci-centers">${items}</ul>
    </div>`;
}

export function renderVariable(model) {
  const rows = model.variable.arrows.map(arrow => {
    // Name and cognition go through the shared vocabulary/format interfaces, so
    // the engine's English labels never leak into a Chinese surface.
    const name = variable(arrow.slot)[0];
    return `
    <li class="ci-variable-row" data-kind="${arrow.kind}" data-side="${arrow.side}">
      <span class="ci-variable-name">${esc(t(variableKindLabel(arrow.kind)))}</span>
      <span class="ci-variable-dir" data-direction="${arrow.direction ?? ''}">${arrow.direction === 'left' ? '◀' : arrow.direction === 'right' ? '▶' : '·'}</span>
      <span class="ci-variable-value">${esc(name)}</span>
      ${arrow.color != null ? `<span class="ci-variable-ctb">${esc(t('Color {color} · Tone {tone} · Base {base}', { color: arrow.color, tone: arrow.tone, base: arrow.base }))}</span>` : ''}
      ${arrow.cognition ? `<span class="ci-variable-cognition">${esc(t('Cognition'))}: ${esc(cognition(arrow.cognition))}</span>` : ''}
      <button type="button" class="ci-link" data-ci-variable="${arrow.kind}">${esc(t('Read variable reading'))}</button>
    </li>`;
  }).join('');
  return `
    ${breadcrumb('Variable')}
    <div class="ci-detail" data-ci-detail="variable">
      ${model.variable.notation ? `<p class="ci-count">${esc(t('Standard notation:'))} ${esc(model.variable.notation)}</p>` : ''}
      <ul class="ci-variables">${rows}</ul>
    </div>`;
}

export function renderCross(model) {
  const { cross } = model;
  const positions = ['Personality Sun', 'Personality Earth', 'Design Sun', 'Design Earth'];
  // crossName() owns the translated title and quartet; the engine's English
  // fullName is only a fallback when the raw cross is missing.
  const fullName = cross.raw ? crossName(cross.raw) : (cross.fullName ?? cross.name ?? '—');
  const gates = cross.gates.map((gate, index) => `
    <li class="ci-cross-gate" data-gate="${gate}">
      <span class="ci-cross-position">${esc(t(positions[index] ?? 'Gate'))}</span>
      <button type="button" class="ci-link" data-ci-gate="${gate}">${esc(t('Gate {gate}', { gate }))}</button>
      <span class="ci-cross-gate-name">${esc(gateName(gate))}</span>
    </li>`).join('');
  const quarter = cross.quarterGate ? quarterForGate(cross.quarterGate, getLocale()) : null;
  const sequence = cross.geneKeys;
  const spheres = sequence ? [
    ['lifeWork', "Life's Work"], ['evolution', 'Evolution'],
    ['radiance', 'Radiance'], ['purpose', 'Purpose']
  ].filter(([id]) => sequence[id]) : [];
  const geneKeys = spheres.length ? `
    <section class="ci-genekeys" aria-labelledby="ci-genekeys-title">
      <h3 id="ci-genekeys-title">${esc(t('Gene Keys — Activation Sequence'))}</h3>
      <p class="ci-count">${esc(t("The same four positions through Richard Rudd's Shadow → Gift → Siddhi lens."))}</p>
      <ul class="ci-genekeys-list">${spheres.map(([id, label]) => {
        const sphere = sequence[id];
        return `<li class="ci-genekey" data-sphere="${id}">
          <span class="ci-genekey-name">${esc(t(label))}</span>
          <span class="ci-genekey-key">${esc(t('Key {key}', { key: sphere.keyLine || sphere.key }))}</span>
          <span class="ci-genekey-spectrum">${['shadow', 'gift', 'siddhi'].map(field =>
            esc(geneKeyTerm(sphere.key, field, { bilingual: false }) || sphere[field] || '')).filter(Boolean).join(' → ')}</span>
        </li>`;
      }).join('')}</ul>
    </section>` : '';
  return `
    ${breadcrumb('Incarnation Cross')}
    <div class="ci-detail" data-ci-detail="cross">
      <p class="ci-cross-full">${esc(fullName)}</p>
      <p class="ci-count">${[cross.angle ? contentText(cross.angle) : null, quarter ? t('Quarter of {quarter}', { quarter }) : null, cross.theme ? contentText(cross.theme) : null].filter(Boolean).map(esc).join(' · ')}</p>
      <ul class="ci-cross-gates">${gates}</ul>
      <button type="button" class="ci-link" data-ci-read="cross">${esc(t('Read cross reading'))}</button>
      ${geneKeys}
    </div>`;
}

/** Gate map filters. `inactive` shows only inactive gates; `both` is its own state. */
const GATE_FILTERS = Object.freeze([
  ['all', 'Show all'],
  ['active', 'Show active only'],
  ['design', 'Design'],
  ['personality', 'Personality'],
  ['both', 'Both'],
  ['inactive', 'Inactive']
]);

/**
 * Source filters read the two side flags, not the collapsed `source` value, so a
 * gate activated on both sides still appears under Design and under Personality.
 * Only `inactive` is exclusive.
 */
function gateMatches(cell, filter) {
  if (filter === 'all') return true;
  if (filter === 'active') return cell.source !== 'inactive';
  if (filter === 'design') return cell.design;
  if (filter === 'personality') return cell.personality;
  if (filter === 'both') return cell.source === 'both';
  if (filter === 'inactive') return cell.source === 'inactive';
  return true;
}

/** Level 2: the full 64-cell gate map. Columns follow the host width. */
export function renderGates(model, { hostWidth = 0, gateFilter = 'active' } = {}) {
  const columns = gateColumns(hostWidth);
  const filters = GATE_FILTERS.map(([id, label]) => `
    <button type="button" class="ci-filter" data-ci-gate-filter="${id}" aria-pressed="${id === gateFilter}">${esc(t(label))}</button>`).join('');
  const visible = model.gateMap.filter(cell => gateMatches(cell, gateFilter));
  const cells = visible.map(cell => `
    <button type="button" class="ci-gate" data-ci-gate="${cell.gate}" data-source="${cell.source}"
      aria-label="${esc(t('Gate {gate} · {name}', { gate: cell.gate, name: gateName(cell.gate) }))}"
      title="${esc(t('Gate {gate} · {name}', { gate: cell.gate, name: gateName(cell.gate) }))}">
      <span class="ci-gate-number">${cell.gate}</span>
      <span class="ci-gate-mark" aria-hidden="true">${cell.source === 'both' ? 'DP' : cell.source === 'design' ? 'D' : cell.source === 'personality' ? 'P' : ''}</span>
    </button>`).join('');
  return `
    ${breadcrumb('All gates')}
    <div class="ci-detail" data-ci-detail="gates">
      <div class="ci-filters" role="group" aria-label="${esc(t('Filters'))}">${filters}</div>
      <div class="ci-gate-grid" data-ci-columns="${columns}">${cells || `<p class="ci-empty">${esc(t('No gate matches this filter.'))}</p>`}</div>
      <div class="ci-legend">
        <span class="ci-legend-item" data-source="design"><i aria-hidden="true">D</i>${esc(t('Design'))}</span>
        <span class="ci-legend-item" data-source="personality"><i aria-hidden="true">P</i>${esc(t('Personality'))}</span>
        <span class="ci-legend-item" data-source="both"><i aria-hidden="true">DP</i>${esc(t('Both'))}</span>
        <span class="ci-legend-item" data-source="inactive"><i aria-hidden="true"></i>${esc(t('Inactive'))}</span>
      </div>
    </div>`;
}

export { percent };
