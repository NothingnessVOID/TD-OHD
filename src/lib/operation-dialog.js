import '../styles/operation-dialog.css';
import './operation-dialog-messages.js';
import { esc } from './format.js';
import { t } from './i18n.js';

const stack = [];
let previousOverflow;
let background = [];
/** Mount existing .modal content with shared focus, dismissal and scroll ownership. */
export function openOperationDialog({ content, onClose = null, initialFocus = null }) {
 const trigger = document.activeElement;
 const overlay = document.createElement('div');
 overlay.className = 'modal-overlay operation-overlay';
 overlay.innerHTML = content;
 const root = overlay.firstElementChild;
 root.classList.add('operation-dialog'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.tabIndex = -1;
 const parent = stack.at(-1); if (parent) parent.inert = true;
 if (!stack.length) {
  previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
  background = [...document.body.children].map(node => [node, node.inert]);
  background.forEach(([node]) => { node.inert = true; });
 }
 stack.push(overlay); document.body.append(overlay);
 let closed = false;
 const close = (reason = 'cancel') => {
  if (closed) return; closed = true;
  document.removeEventListener('keydown', onKey, true);
  stack.splice(stack.indexOf(overlay), 1); overlay.remove();
  if (stack.length) stack.at(-1).inert = false;
  else { document.body.style.overflow = previousOverflow; background.forEach(([node, inert]) => { node.inert = inert; }); background = []; }
  if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  onClose?.(reason);
 };
 const focusables = () => [...root.querySelectorAll('input,button,select,textarea,a[href],[tabindex]')].filter(n => !n.disabled && n.tabIndex >= 0 && !n.closest('[hidden],.hidden,[inert]') && n.getClientRects().length);
 const onKey = event => {
  if (stack.at(-1) !== overlay) return;
  if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
  if (event.key === 'Tab') {
   const nodes = focusables(), first = nodes[0], last = nodes.at(-1);
   if (!first || !root.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
  }
 };
 document.addEventListener('keydown', onKey, true);
 overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
 root.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => close()));
 (initialFocus ? root.querySelector(initialFocus) : focusables()[0])?.focus();
 return { root, overlay, close };
}

export function confirmOperation(message) {
 return new Promise(resolve => {
  const { root, close } = openOperationDialog({ content: `<section class="modal operation-confirm" aria-label="${esc(t('Confirm'))}"><div class="modal-title">${esc(t('Confirm'))}</div><p class="operation-message"></p><div class="modal-actions"><button type="button" class="btn-secondary" data-close>${esc(t('Cancel'))}</button><button type="button" class="btn-primary" data-confirm>${esc(t('Confirm'))}</button></div></section>`, onClose: reason => resolve(reason === 'confirm') });
  root.querySelector('.operation-message').textContent = message;
  root.querySelector('[data-confirm]').onclick = () => close('confirm');
 });
}
