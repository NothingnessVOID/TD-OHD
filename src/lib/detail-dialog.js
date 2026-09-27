// One active graph detail sheet across views, with consistent dismissal and
// keyboard focus. Reopening the same sheet preserves its original trigger.
import { t } from './i18n.js';

let active = null;

function applyMode() {
  if (!active) return;
  const { element, modal } = active;
  element.classList.toggle('detail-modeless', !modal);
  element.setAttribute('aria-modal', String(modal));
  document.body.classList.toggle('modal-open', modal);
}

export function setDetailDialogModal(element, modal) {
  if (!active || active.element !== element) return false;
  active.modal = Boolean(modal);
  applyMode();
  return true;
}

export function closeDetailDialog() {
  if (!active) return;
  const { element, cleanup, onClose, trigger } = active;
  active = null;
  element.classList.add('hidden');
  element.classList.remove('detail-modeless');
  document.body.classList.remove('modal-open');
  cleanup();
  onClose?.();
  if (trigger?.isConnected) trigger.focus({ preventScroll: true });
}

export function openDetailDialog(element, onClose) {
  if (active?.element !== element) {
    closeDetailDialog();
    const trigger = document.activeElement;
    const onBackdrop = e => { if (e.target === element) closeDetailDialog(); };
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); closeDetailDialog(); }
      if (e.key !== 'Tab' || !active?.modal) return;
      const buttons = [...element.querySelectorAll('button, [tabindex="0"]')];
      const first = buttons[0], last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first?.focus();
      }
    };
    element.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);
    active = { element, trigger, onClose, modal: true, cleanup() {
      element.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
    } };
  }
  element.classList.remove('hidden');
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-label', t('Bodygraph details'));
  applyMode();
  element.querySelector('.gate-detail-close')?.addEventListener('click', closeDetailDialog);
  if (active?.modal) element.querySelector('.gate-detail-close')?.focus({ preventScroll: true });
}
