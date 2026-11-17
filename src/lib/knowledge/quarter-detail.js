/** Shared quarter article body and reading-category switch.
 * Hosts (chart knowledge controller, Reference library, Wa member frames) all render the
 * same markup and receive the same delegated switch. Switching replaces only the lens body
 * and the pressed state: identity, purpose theme, the 16 gates and the personal basis stay.
 */
import { renderReadingLensSwitch } from '../reading-lenses.js';
import { getLocale, t } from '../i18n.js';
import { esc } from '../format.js';
import { gateName } from '../vocabulary.js';
import { quarterIdForGate, quarterGatesFor } from '../quarter.js';
import { QUARTER_LENS_IDS, quarterLensOptions, quarterLensText, quarterTheme, quarterBusinessLead } from '../quarter-content.js';
import '../quarter-messages.js';

const bindings = new WeakMap();
const lensOf = value => QUARTER_LENS_IDS.includes(value) ? value : 'hd';
const paragraph = text => text ? `<p>${esc(text)}</p>` : '';

/** Lens body only; the caller owns the container so a switch never rebuilds the article. */
export function renderQuarterLensBody(id, lens = 'hd') {
  const selected = lensOf(lens);
  const lead = selected === 'business' ? quarterBusinessLead(getLocale()) : null;
  return paragraph(lead) + paragraph(quarterLensText(id, selected, getLocale()));
}

/** Personal basis is accepted only for a gate that actually belongs to this quarter.
 *  The caller passes {gate, line, estimated}; nothing else is read or inferred. */
export function quarterPersonalBasis(quarterId, context) {
  const gate = Number(context?.gate);
  if (!Number.isInteger(gate) || gate < 1 || gate > 64) return null;
  if (quarterIdForGate(gate) !== quarterId) return null;
  const line = Number.isInteger(context?.line) && context.line >= 1 && context.line <= 6 ? context.line : null;
  return { gate, line, estimated: context?.estimated === true };
}

export function renderQuarterArticle(entry, { quarterContext = null, quarterLens = 'hd' } = {}) {
  const id = entry.objectId;
  const lens = lensOf(quarterLens);
  const personal = quarterPersonalBasis(id, quarterContext);
  const gates = quarterGatesFor(id) ?? [];
  return `<div class="knowledge-quarter" data-quarter-article data-quarter-id="${esc(id)}" data-quarter-lens-current="${lens}">
    <p class="knowledge-quarter-purpose"><span class="knowledge-summary-label">${esc(t('Quarter purpose'))}</span><span class="knowledge-quarter-theme">${esc(quarterTheme(id, getLocale()) ?? '')}</span></p>
    ${personal ? `<p class="knowledge-quarter-personal" data-quarter-personal>${esc(t('Quarter personal basis', { gate: personal.gate, line: personal.line ?? '—' }))}${personal.estimated ? ` · ${esc(t('Quarter estimated'))}` : ''}</p>` : ''}
    ${renderReadingLensSwitch({ className: 'quarter-lens-switch', lenses: quarterLensOptions(), selectedLens: lens, dataAttribute: 'data-quarter-lens' })}
    <div class="knowledge-reading" data-quarter-body>${renderQuarterLensBody(id, lens)}</div>
    <section class="knowledge-surface knowledge-quarter-gates" data-quarter-gates>
      <h3>${esc(t('Quarter gates'))}</h3>
      <div class="knowledge-chips">${gates.map(gate => {
        const mine = personal?.gate === gate;
        return `<button type="button" class="knowledge-chip knowledge-quarter-gate${mine ? ' is-personal' : ''}" data-quarter-gate="${gate}" data-activation="quarter-gate-${gate}"${mine ? ' data-quarter-personal-gate="true"' : ''} aria-label="${esc(`${t('Gate {gate}', { gate })} · ${gateName(gate)}`)}">${gate} · ${esc(gateName(gate))}</button>`;
      }).join('')}</div>
    </section>
  </div>`;
}

/** Delegated lens switch. Idempotent per root; returns an idempotent dispose.
 *  Only the body and the button state change here, so personal/gate DOM is never rebuilt. */
export function bindQuarterReadingSwitch(root, { onChange } = {}) {
  bindings.get(root)?.();
  const onClick = event => {
    const button = event.target.closest?.('button[data-quarter-lens]');
    if (!button || !root.contains(button)) return;
    const article = button.closest('[data-quarter-article]');
    const lens = button.dataset.quarterLens;
    if (!article || !QUARTER_LENS_IDS.includes(lens)) return;
    article.querySelectorAll('button[data-quarter-lens]').forEach(node => {
      const active = node.dataset.quarterLens === lens;
      node.classList.toggle('active', active);
      node.setAttribute('aria-pressed', String(active));
    });
    const body = article.querySelector('[data-quarter-body]');
    if (body) body.innerHTML = renderQuarterLensBody(article.dataset.quarterId, lens);
    article.dataset.quarterLensCurrent = lens;
    onChange?.(lens);
  };
  root.addEventListener('click', onClick);
  const dispose = () => { root.removeEventListener('click', onClick); if (bindings.get(root) === dispose) bindings.delete(root); };
  bindings.set(root, dispose);
  return dispose;
}
