// One active graph detail sheet across views, with consistent dismissal and
// keyboard focus. Reopening the same sheet preserves its original trigger.
import { t } from './i18n.js';
import { PHONE_MAX_WIDTH } from './breakpoints.js';

let active = null;

export function closeDetailDialog() {
  if (!active) return;
  const { element, cleanup, onClose, trigger } = active;
  active = null;
  element.classList.add('hidden');
  document.body.classList.remove('modal-open');
  cleanup();
  delete element.dataset.detailOwner;
  onClose?.();
  if (trigger?.isConnected) trigger.focus({ preventScroll: true });
}

/** Release the previous controller before a new renderer writes its own state/DOM. */
export function prepareDetailDialog(element, owner = 'bodygraph') {
  if (active && (active.element !== element || active.owner !== owner)) closeDetailDialog();
}

export function openDetailDialog(element, onClose, { owner = 'bodygraph', label = t('Bodygraph details') } = {}) {
  prepareDetailDialog(element, owner);
  if (!active) {
    closeDetailDialog();
    const trigger = document.activeElement;
    const onBackdrop = e => { if (e.target === element) closeDetailDialog(); };
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); closeDetailDialog(); }
      if (e.key !== 'Tab') return;
      const buttons = [...element.querySelectorAll('button, a[href], [tabindex="0"]')];
      const first = buttons[0], last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first?.focus();
      }
    };
    element.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);
    active = { element, owner, trigger, onClose, cleanup() {
      element.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
    } };
  }
  element.classList.remove('hidden');
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-modal', 'true');
  element.setAttribute('aria-label', label);
  element.dataset.detailOwner = owner;
  document.body.classList.add('modal-open');
  element.querySelector('.gate-detail-close')?.addEventListener('click', closeDetailDialog);
  element.querySelector('.gate-detail-close')?.focus({ preventScroll: true });
}

// Exact extraction of the existing chart Bottom Sheet sizing algorithm.
export function fitDetailSheetHeight(card, prevH = null) {
  if (window.innerWidth > PHONE_MAX_WIDTH) return;
  const maxH = window.innerHeight * 0.82;
  const minH = window.innerHeight * 0.35;
  const navH = card.querySelector('.gate-detail-nav')?.offsetHeight ?? 0;
  const bodyH = card.querySelector('.gate-detail-body')?.scrollHeight ?? card.scrollHeight;
  const targetH = Math.min(Math.max(navH + bodyH + 20, minH), maxH);
  if (prevH != null) {
    card.style.transition = 'none';
    card.style.height = prevH + 'px';
    card.offsetHeight; // force reflow
    card.style.transition = 'height 260ms cubic-bezier(0.4, 0, 0.2, 1)';
  }
  card.style.height = targetH + 'px';
}
