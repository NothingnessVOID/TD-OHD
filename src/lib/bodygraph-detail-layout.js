/** Shared chart-detail heading, activation states and optional timeline timing. */
import { t } from './i18n.js';
import { esc } from './format.js';

function activationRow(node, [planet, activation, side]) {
  node.classList.add('tl-activation-row');
  node.dataset.activationSide = side;
  node.dataset.activationPlanet = planet;
  node.dataset.activationValue = `${activation.gate}.${activation.line}`;
  if (side === 'transit') node.classList.add('tl-activation-transit');
}

function appendActivations(body, header, heading, selection, chart, context) {
  const gate = Number(selection.id);
  const natalEntries = ['design', 'personality'].flatMap(side =>
    Object.entries(chart.gates[side] || {})
      .filter(([, value]) => value?.gate === gate)
      .map(([planet, value]) => [planet, value, side]));
  const transitEntries = Object.entries(context?.transitGates || {})
    .filter(([, value]) => value?.gate === gate)
    .map(([planet, value]) => [planet, value, 'transit']);
  const statuses = document.createElement('div');
  statuses.className = 'tl-detail-statuses';
  const sources = document.createElement('div');
  sources.className = 'tl-detail-activations';

  const addStatus = (active, activeKey, inactiveKey, className) => {
    const status = document.createElement('div');
    status.className = `tl-activation-label ${className}${active ? '' : ' tl-activation-inactive'}`;
    status.textContent = t(active ? activeKey : inactiveKey);
    statuses.append(status);
  };
  const addGroup = (selector, entries) => {
    const group = body.querySelector(selector);
    if (!group) return;
    const rows = [...group.querySelectorAll(':scope > span')];
    rows.forEach((node, index) => {
      if (entries[index]) activationRow(node, entries[index]);
    });
    group.replaceChildren(...rows);
    group.classList.add('tl-detail-source');
    sources.append(group);
  };

  addStatus(natalEntries.length, 'Birth activations', 'Birth not activated', 'tl-activation-natal');
  addGroup('.gate-detail-acts', natalEntries);
  if (context) {
    addStatus(transitEntries.length, 'Transit activations', 'Transit not activated', 'tl-activation-transit');
    addGroup('.gate-detail-transits', transitEntries);
  }
  heading.append(statuses);
  if (sources.childElementCount) header.after(sources);
}

function appendTiming(header, timing) {
  if (!timing) return;
  header.classList.add('tl-detail-has-timing');
  const aside = document.createElement('aside');
  aside.className = 'tl-detail-timing';
  aside.dataset.kind = timing.kind;
  aside.dataset.id = timing.id;
  aside.setAttribute('aria-label', timing.label);
  aside.innerHTML = `<div class="tl-timing-source" title="${esc(timing.sourceTitle)}">${esc(timing.source)}<span title="${esc(timing.estimateTitle)}" aria-label="${esc(timing.estimateLabel)}">≈</span></div>
    <dl class="tl-timing-values"><div class="tl-timing-duration"><dt title="${esc(timing.durationTitle)}">${esc(timing.durationLabel)}</dt><dd>${esc(timing.durationValue)}</dd></div>
    <div class="tl-timing-boundary"><dt>${esc(timing.startLabel)}</dt><dd title="${esc(timing.startTitle)}">${esc(timing.startValue)}</dd></div>
    <div class="tl-timing-boundary"><dt>${esc(timing.endLabel)}</dt><dd title="${esc(timing.endTitle)}">${esc(timing.endValue)}</dd></div></dl>`;
  header.append(aside);
}

export function decorateBodygraphDetail(detail, selection, chart, context) {
  const body = detail.querySelector('.gate-detail-body');
  const label = body?.querySelector(':scope > .detail-label');
  const title = body?.querySelector(':scope > .detail-name, :scope > .channel-detail-heading');
  if (!body || !label || !title) return;
  const header = document.createElement('div');
  header.className = 'tl-detail-header';
  const heading = document.createElement('div');
  heading.className = 'tl-detail-heading';
  body.prepend(header);
  heading.append(label, title);
  header.append(heading);

  if (selection.kind === 'gate') {
    appendActivations(body, header, heading, selection, chart, context);
  } else if (selection.kind === 'center') {
    const centerHead = body.querySelector('.center-detail-head');
    if (centerHead) heading.append(centerHead);
  } else if (selection.kind === 'channel') {
    const source = body.querySelector(':scope > .transit-source-badge');
    if (source) {
      if (source.classList.contains('natal') || source.classList.contains('defined')) {
        source.textContent = t('Birth activations');
        source.classList.add('tl-activation-natal');
      }
      source.classList.add('tl-activation-label', 'tl-detail-channel-status');
      heading.append(source);
    }
  }
  appendTiming(header, context?.detailTiming?.(selection));
}
