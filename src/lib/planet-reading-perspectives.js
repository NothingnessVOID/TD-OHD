// Planet detail reads one of two categories: the existing Human Design reference or the
// BG5 textbook business copy. The switch replaces only the reading text; activation,
// source labels, graph pin and the host dialog stay untouched.
import { esc } from './format.js';
import { getLocale, t } from './i18n.js';
import { renderPlanetReading, renderActivationReference } from './planet-reference.js';
import { planetBusinessCopy, hasPlanetBusinessContent } from './planet-business-content.js';
import { renderReadingLensSwitch } from './reading-lenses.js';
import './planet-reading-perspectives-messages.js';

export const PLANET_READING_LENSES = Object.freeze(['hd', 'business']);
const bindings = new WeakMap();

const lensButtons = () => [
  ['hd', t('Planet reading human design')],
  ['business', t('Planet reading business')]
];

/** Unknown or stale values fall back to the default category instead of throwing. */
export function resolvePlanetLens(lens) {
  return PLANET_READING_LENSES.includes(lens) ? lens : 'hd';
}

/** Reading text only: the Human Design lens reuses the untouched reference markup. */
export function planetReadingBody(planet, locale = 'en', lens = 'hd') {
  if (!hasPlanetBusinessContent(planet)) return '';
  if (resolvePlanetLens(lens) === 'hd') return renderPlanetReading(planet, locale);
  const copy = planetBusinessCopy(planet, locale);
  if (!copy) return `<div class="planet-reading-body"><p>${esc(t('Planet reading business pending'))}</p></div>`;
  return `<p class="planet-reading-lead">${esc(copy.theme)}</p><div class="planet-reading-body">${renderActivationReference(copy.body)}</div>`;
}

/** Two-item switch plus the reading region. Empty for an unknown planet id. */
export function renderPlanetReadingPerspectives(planet, locale = 'en', lens = 'hd') {
  if (!hasPlanetBusinessContent(planet)) return '';
  const active = resolvePlanetLens(lens);
  return `<section data-planet-reading data-planet="${esc(planet)}" data-planet-lens-current="${active}">${renderReadingLensSwitch({
    className: 'planet-lens-switch',
    lenses: lensButtons(),
    selectedLens: active,
    dataAttribute: 'data-planet-lens'
  })}<div data-planet-reading-body>${planetReadingBody(planet, locale, active)}</div></section>`;
}

/** Click delegation for one host root. Re-binding the same root disposes the previous listener;
 *  the buttons are never re-rendered, so focus and aria-pressed stay on the clicked control. */
export function bindPlanetReadingSwitch(root, { onLensChange } = {}) {
  bindings.get(root)?.();
  const onClick = event => {
    const target = event.target.closest?.('button[data-planet-lens]');
    if (!target || !root.contains(target)) return;
    const section = target.closest('[data-planet-reading]');
    const lens = target.dataset.planetLens;
    if (!section || !PLANET_READING_LENSES.includes(lens)) return;
    section.querySelectorAll('button[data-planet-lens]').forEach(button => {
      const active = button.dataset.planetLens === lens;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const body = section.querySelector('[data-planet-reading-body]');
    if (body) body.innerHTML = planetReadingBody(section.dataset.planet, getLocale(), lens);
    section.dataset.planetLensCurrent = lens;
    onLensChange?.(lens);
  };
  root.addEventListener('click', onClick);
  const dispose = () => {
    root.removeEventListener('click', onClick);
    if (bindings.get(root) === dispose) bindings.delete(root);
  };
  bindings.set(root, dispose);
  return dispose;
}
