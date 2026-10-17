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
  // Content renderers rewrite innerHTML (and therefore the card element) on every
  // navigation step inside an open sheet. The entrance animation belongs to the
  // hidden → visible transition only, so it is driven by a class on the sheet that
  // is cleared as soon as it has played; a later innerHTML swap finds no class and
  // stays still.
  const wasHidden = element.classList.contains('hidden');
  if (!active) {
    closeDetailDialog();
    const trigger = document.activeElement;
    const onBackdrop = e => { if (e.target === element) closeDetailDialog(); };
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); closeDetailDialog(); }
      if (e.key !== 'Tab') return;
      const buttons = [...element.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')]
        .filter(node => !node.disabled && node.tabIndex >= 0 && !node.closest('[hidden], .hidden') && node.getClientRects().length);
      const first = buttons[0], last = buttons.at(-1);
      if (!element.contains(document.activeElement)) {
        e.preventDefault(); (e.shiftKey ? last : first)?.focus();
      } else if (e.shiftKey && document.activeElement === first) {
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
  // Play the entrance only when the sheet itself was closed before this call.
  // Steps taken while it is already open (gate → channel → back) keep the card steady.
  if (wasHidden) {
    element.classList.remove('sheet-entering');
    // Force a style flush so a reopened sheet restarts the animation instead of
    // inheriting a finished one.
    void element.offsetWidth;
    element.classList.add('sheet-entering');
  }
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-modal', 'true');
  element.setAttribute('aria-label', label);
  element.dataset.detailOwner = owner;
  document.body.classList.add('modal-open');
  element.querySelector('.gate-detail-close')?.addEventListener('click', closeDetailDialog);
  // Drop the entrance class once the animation has run, so a later content swap inside
  // the same open sheet cannot replay it.
  const card = element.querySelector('.gate-detail-card');
  if (card && wasHidden) {
    const done = () => element.classList.remove('sheet-entering');
    card.addEventListener('animationend', done, { once: true });
    // Reduced motion (or a missing animation) never fires animationend; clear anyway.
    setTimeout(done, 400);
  }
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
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    card.style.transition = 'none';
  } else if (prevH != null) {
    card.style.transition = 'none';
    card.style.height = prevH + 'px';
    card.offsetHeight; // force reflow
    card.style.transition = 'height 260ms cubic-bezier(0.4, 0, 0.2, 1)';
  }
  card.style.height = targetH + 'px';
}
