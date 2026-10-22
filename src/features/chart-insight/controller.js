/**
 * Chart insight controller — owns dashboard state and DOM wiring.
 *
 * The host (chart.js) supplies the model and the callbacks that reach chart
 * feature functions (detail dialogs, left-graph hover, knowledge reads). This
 * module never imports chart.js, so there is no cycle.
 *
 * State is kept per host element so a re-render after a locale or person change
 * restores the same level and filters.
 */
import { buildInsightModel } from './model.js';
import {
  renderOverview, renderCircuits, renderPlanets, renderCenters,
  renderVariable, renderCross, renderGates, gateColumns
} from './view.js';
import './styles.css';

const DEFAULTS = Object.freeze({
  level: 'overview',
  gateFilter: 'active',
  circuitStatus: 'active',
  subcircuit: 'all'
});

/** Per-host state, keyed by the host element itself. */
const states = new WeakMap();

/**
 * Focus descriptors survive innerHTML replacement; detached DOM nodes do not.
 * The opener is identified by its stable `data-ci-open` id so returning from a
 * level lands on the metric that was actually opened, not on the first one.
 */
function focusDescriptor(host) {
  const active = document.activeElement;
  if (!active || !host.contains(active)) return null;
  const opener = active.closest('[data-ci-open]');
  if (opener) return { open: opener.dataset.ciOpen };
  const gateFilter = active.closest('[data-ci-gate-filter]');
  if (gateFilter) return { selector: `[data-ci-gate-filter="${gateFilter.dataset.ciGateFilter}"]` };
  const status = active.closest('[data-ci-status]');
  if (status) return { selector: `[data-ci-status="${status.dataset.ciStatus}"]` };
  if (active.matches('.ci-back')) return { selector: '.ci-back' };
  if (active.matches('.ci-gate-grid')) return { selector: '.ci-gate-grid' };
  if (active.matches('.ci-filters')) return { selector: '.ci-filters' };
  return null;
}

/** Resolve a descriptor against the freshly rendered host. */
function resolveFocus(host, descriptor) {
  if (!descriptor) return host.querySelector('.ci-title');
  if (typeof descriptor === 'string') return host.querySelector(descriptor);
  if (descriptor.open) return host.querySelector(`[data-ci-open="${descriptor.open}"]`);
  return host.querySelector(descriptor.selector);
}

function stateOf(host) {
  let state = states.get(host);
  if (!state) {
    state = { ...DEFAULTS, model: null, meta: null, handlers: null };
    states.set(host, state);
  }
  return state;
}

/** Column count for the full gate map, measured from the host, not the viewport. */
function measure(host) {
  const width = host.getBoundingClientRect().width || host.clientWidth || 0;
  return { width, columns: gateColumns(width) };
}

function renderLevel(host, { focus = undefined, restoreScroll = null } = {}) {
  const state = stateOf(host);
  if (!state.model) return;
  const { width } = measure(host);
  const previousScroll = restoreScroll ?? window.scrollY;
  let html;
  switch (state.level) {
    case 'circuits':
      html = renderCircuits(state.model, { status: state.circuitStatus, subcircuit: state.subcircuit });
      break;
    case 'planets':
      html = renderPlanets(state.model, { fixings: state.fixings });
      break;
    case 'centers':
      html = renderCenters(state.model);
      break;
    case 'variable':
      html = renderVariable(state.model);
      break;
    case 'cross':
      html = renderCross(state.model);
      break;
    case 'gates':
      html = renderGates(state.model, { hostWidth: width, gateFilter: state.gateFilter });
      break;
    default:
      html = renderOverview(state.model, { meta: state.meta });
  }
  host.innerHTML = html;
  wire(host);

  // Restore reading position and focus on the new level's entry point.
  if (restoreScroll != null) window.scrollTo({ top: previousScroll, behavior: 'instant' });
  if (focus !== undefined) {
    const target = resolveFocus(host, focus) ?? host.querySelector('.ci-back, .ci-title');
    target?.focus?.({ preventScroll: true });
  }
}

/**
 * Switch level without jumping the page.
 *
 * The host is re-rendered with innerHTML, so any element measured before the
 * render is detached afterwards. The host's own document offset is stable across
 * the swap, so the scroll correction is derived from that instead.
 */
function openLevel(host, level) {
  const state = stateOf(host);
  const descriptor = focusDescriptor(host);
  const hostTop = host.getBoundingClientRect().top;
  const scroll = window.scrollY;
  state.level = level;
  state.returnFocus = descriptor;
  state.returnScroll = scroll;
  renderLevel(host, { restoreScroll: scroll });
  // Compensate for any height change above the host so its top edge stays put.
  const drift = host.getBoundingClientRect().top - hostTop;
  if (drift) window.scrollBy({ top: drift, behavior: 'instant' });
  host.querySelector('.ci-back, .ci-title')?.focus?.({ preventScroll: true });
}

/** Return to the overview and restore the focus target that opened the level. */
function backToOverview(host) {
  const state = stateOf(host);
  const descriptor = state.returnFocus;
  const scroll = state.returnScroll ?? window.scrollY;
  state.level = 'overview';
  state.returnFocus = null;
  state.returnScroll = null;
  renderLevel(host, { restoreScroll: scroll, focus: descriptor });
}

/** Reads a knowledge object through the host callback. */
function readObject(host, kind) {
  const state = stateOf(host);
  state.handlers?.onReadObject?.(kind);
}

function wire(host) {
  const state = stateOf(host);
  const handlers = state.handlers ?? {};

  host.querySelectorAll('[data-ci-open]').forEach(node => {
    node.addEventListener('click', () => openLevel(host, node.dataset.ciOpen));
  });

  host.querySelectorAll('[data-ci-back]').forEach(node => {
    node.addEventListener('click', () => backToOverview(host));
  });

  // One binding for every knowledge read: identity chips and the explicit read
  // links both carry data-ci-read, so there is no second path to the same object.
  host.querySelectorAll('[data-ci-read]').forEach(node => {
    node.addEventListener('click', () => readObject(host, node.dataset.ciRead));
  });

  host.querySelectorAll('[data-ci-gate]').forEach(node => {
    const gate = Number(node.dataset.ciGate);
    node.addEventListener('click', () => handlers.onGate?.(gate));
    node.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      handlers.onHoverGate?.(gate);
    });
    node.addEventListener('pointerleave', event => {
      if (event.pointerType === 'touch') return;
      handlers.onHoverGate?.(null);
    });
    node.addEventListener('focus', () => handlers.onHoverGate?.(gate));
    node.addEventListener('blur', () => handlers.onHoverGate?.(null));
  });

  host.querySelectorAll('[data-ci-gate-inline]').forEach(node => {
    const gate = Number(node.dataset.ciGateInline);
    node.addEventListener('click', event => {
      event.stopPropagation();
      handlers.onGate?.(gate);
    });
  });

  host.querySelectorAll('[data-ci-channel]').forEach(node => {
    const key = node.dataset.ciChannel;
    node.addEventListener('click', () => handlers.onChannel?.(key));
    node.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      handlers.onHoverChannel?.(key);
    });
    node.addEventListener('pointerleave', event => {
      if (event.pointerType === 'touch') return;
      handlers.onHoverChannel?.(null);
    });
  });

  host.querySelectorAll('[data-ci-planet]').forEach(node => {
    node.addEventListener('click', () => handlers.onPlanet?.({
      side: node.dataset.side,
      planet: node.dataset.ciPlanet
    }));
  });

  host.querySelectorAll('[data-ci-center]').forEach(node => {
    node.addEventListener('click', () => handlers.onCenter?.(node.dataset.ciCenter));
  });

  host.querySelectorAll('[data-ci-variable]').forEach(node => {
    node.addEventListener('click', () => handlers.onVariable?.(node.dataset.ciVariable));
  });

  host.querySelectorAll('[data-ci-gate-filter]').forEach(node => {
    node.addEventListener('click', () => {
      state.gateFilter = node.dataset.ciGateFilter;
      renderLevel(host, { focus: '.ci-gate-grid' });
    });
  });

  host.querySelectorAll('[data-ci-status]').forEach(node => {
    node.addEventListener('click', () => {
      state.circuitStatus = node.dataset.ciStatus;
      renderLevel(host, { focus: '.ci-filters' });
    });
  });

  host.querySelectorAll('[data-ci-subcircuit]').forEach(node => {
    node.addEventListener('click', () => {
      state.subcircuit = node.dataset.ciSubcircuit;
      renderLevel(host, { focus: '.ci-filters' });
    });
  });
}

/**
 * Mount or update the dashboard.
 *
 * @param {HTMLElement} host
 * @param {{ chart: object, meta?: object, fixings?: object, handlers: object, preserveLevel?: boolean }} options
 */
export function mountInsight(host, { chart, geneKeys = null, meta = null, fixings = null, handlers = {}, preserveLevel = true } = {}) {
  if (!host) return null;
  const state = stateOf(host);
  state.model = buildInsightModel(chart, { geneKeys });
  state.meta = meta;
  state.fixings = fixings;
  state.handlers = handlers;
  if (!preserveLevel) Object.assign(state, DEFAULTS);
  // A person or chart change starts again at the overview.
  renderLevel(host);
  return state.model;
}

/** Re-render the current level, keeping state. Used by locale switches. */
export function refreshInsight(host) {
  if (!host) return;
  renderLevel(host);
}

/** Current level, for tests and for the host's Escape handling. */
export function insightLevel(host) {
  return host ? stateOf(host).level : null;
}

/** Step back one level. Returns true when it handled the call. */
export function insightBack(host) {
  if (!host) return false;
  const state = stateOf(host);
  if (state.level === 'overview') return false;
  backToOverview(host);
  return true;
}

/** Remeasure column count after the host resizes. */
export function remeasureInsight(host) {
  if (!host) return;
  const state = stateOf(host);
  if (state.level !== 'gates') return;
  const grid = host.querySelector('.ci-gate-grid');
  if (!grid) return;
  grid.dataset.ciColumns = String(measure(host).columns);
}

export { DEFAULTS };
