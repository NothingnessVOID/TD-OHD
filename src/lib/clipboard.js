/**
 * One clipboard path for every share-menu copy action.
 *
 * Hosts differ: an Android WebView may expose no `navigator.clipboard`, and a
 * desktop embedded browser can reject `writeText` even when the API exists.
 * So the async API is always tried first — started synchronously inside the
 * user's click, before any `await` — and any failure falls back to the legacy
 * textarea + `execCommand('copy')` path. When both fail the caller shows the
 * manual dialog: the plain text stays selectable and nothing is claimed as
 * copied. The dialog is imported on demand so this module stays loadable in
 * Node tests (the dialog pulls in its stylesheet).
 */
import { setMessage, t } from './i18n.js';

const busy = new WeakSet();
const timers = new WeakMap();
const tokens = new WeakMap();

/** Replacement for one-shot button labels: a newer message always wins. */
export function setButtonFeedback(button, source, reset, { duration = 2500 } = {}) {
  if (!button) return;
  const token = (tokens.get(button) ?? 0) + 1;
  tokens.set(button, token);
  clearTimeout(timers.get(button));
  button.textContent = t(source);
  const timer = setTimeout(() => {
    if (tokens.get(button) !== token || !button.isConnected) return;
    button.textContent = t(reset);
  }, duration);
  // Browsers return a number; Node returns a handle that must not hold the process open.
  timer?.unref?.();
  timers.set(button, timer);
}

/**
 * Legacy copy: a throwaway read-only textarea selected and copied with
 * `execCommand`. Call it inside a user gesture; it returns true only when the
 * command explicitly reports success. Focus, text-field selection, document
 * selection and scroll position are restored afterwards.
 */
export function legacyCopyText(text) {
  const value = String(text ?? '');
  if (typeof document === 'undefined' || !document.body) return false;
  const active = document.activeElement;
  const field = active && typeof active.setSelectionRange === 'function' ? active : null;
  const fieldSelection = field ? [field.selectionStart, field.selectionEnd, field.selectionDirection] : null;
  const selection = typeof document.getSelection === 'function' ? document.getSelection() : null;
  const ranges = [];
  for (let index = 0; selection && index < selection.rangeCount; index += 1) {
    try { ranges.push(selection.getRangeAt(index).cloneRange()); } catch { /* keep the restorable ones */ }
  }
  const scrollX = globalThis.scrollX ?? 0;
  const scrollY = globalThis.scrollY ?? 0;

  const area = document.createElement('textarea');
  area.value = value;
  area.readOnly = true;
  area.tabIndex = -1;
  area.setAttribute('aria-hidden', 'true');
  // Off-screen but focusable; fixed positioning keeps the page from scrolling.
  area.style.cssText = 'position:fixed;top:0;left:-9999px;width:1px;height:1px;opacity:0;';
  document.body.appendChild(area);
  let copied = false;
  try {
    area.focus({ preventScroll: true });
    area.select();
    area.setSelectionRange(0, value.length);
    copied = document.execCommand('copy') === true;
  } catch {
    copied = false;
  } finally {
    area.remove();
    if (field && field.isConnected) {
      field.focus({ preventScroll: true });
      try { field.setSelectionRange(...fieldSelection); } catch { /* non-text controls */ }
    } else {
      if (active?.isConnected && typeof active.focus === 'function') active.focus({ preventScroll: true });
      if (selection && ranges.length) {
        selection.removeAllRanges();
        ranges.forEach(range => { try { selection.addRange(range); } catch { /* detached range */ } });
      }
    }
    if (typeof globalThis.scrollTo === 'function' && (globalThis.scrollX !== scrollX || globalThis.scrollY !== scrollY)) {
      globalThis.scrollTo(scrollX, scrollY);
    }
  }
  return copied;
}

/** True when the text reached the clipboard by either path. */
export async function copyPlainText(text) {
  const value = String(text ?? '');
  const clipboard = globalThis.navigator?.clipboard;
  if (value && typeof clipboard?.writeText === 'function') {
    let pending = null;
    try {
      // Started here, inside the caller's click: no await may precede this call.
      pending = clipboard.writeText(value);
    } catch {
      pending = null; // synchronous throw: the legacy path is the only option
    }
    if (pending) {
      try {
        await pending;
        return true;
      } catch { /* rejection: fall through to the legacy path */ }
    }
  }
  return legacyCopyText(value);
}

/**
 * Copy from a menu button: one attempt per click, the button is disabled while
 * it runs, and a full failure opens the manual dialog instead of a bare error.
 */
export async function copyFromButton(button, text, { success, reset = null } = {}) {
  if (!button || busy.has(button)) return false;
  const resetSource = reset ?? button.textContent;
  // Disabling the control drops focus; remember whether this click owned it so
  // keyboard and touch users end up back on the same button.
  const hadFocus = typeof document !== 'undefined' && document.activeElement === button;
  busy.add(button);
  button.disabled = true;
  let copied = false;
  try {
    copied = await copyPlainText(text);
  } finally {
    busy.delete(button);
    button.disabled = false;
  }
  if (copied) {
    if (hadFocus) restoreFocus(button);
    setButtonFeedback(button, success, resetSource);
    return true;
  }
  setButtonFeedback(button, 'Copy blocked — please try again', resetSource);
  const dialog = await openManualCopyDialog(text, { onCopied: () => setButtonFeedback(button, success, resetSource) });
  // Report back only after the dialog is dismissed: the caller restores focus then.
  await dialog.closed;
  if (hadFocus) restoreFocus(button);
  return false;
}

function restoreFocus(button) {
  if (button.isConnected && button.getClientRects().length) button.focus({ preventScroll: true });
}

/**
 * Manual path: the export text is shown in a read-only textarea (as `.value`,
 * never as markup) with an explicit "nothing copied yet" note. "Copy again"
 * runs the legacy path inside this fresh click, because the user activation of
 * the original click may have expired while waiting for the rejection.
 */
export async function openManualCopyDialog(text, { onCopied = null } = {}) {
  const value = String(text ?? '');
  const { openOperationDialog, renderDialogHeader } = await import('./operation-dialog.js');
  let resolveClosed;
  const closed = new Promise(resolve => { resolveClosed = resolve; });
  const { root, close } = openOperationDialog({
    content: `<section class="modal manual-copy">${renderDialogHeader(t('Copy manually'))}<p class="operation-message"></p><textarea class="manual-copy-text" readonly spellcheck="false"></textarea><div class="modal-actions"><button type="button" class="btn-primary" data-manual-retry></button></div></section>`,
    initialFocus: '.manual-copy-text',
    onClose: () => resolveClosed(),
  });
  const hint = root.querySelector('.operation-message');
  const area = root.querySelector('.manual-copy-text');
  const retry = root.querySelector('[data-manual-retry]');
  setMessage(hint, 'Nothing has been copied yet. Select the text below and copy it, or press Copy again.');
  setMessage(retry, 'Copy again');
  area.setAttribute('aria-label', t('Text to copy'));
  area.value = value;
  area.focus({ preventScroll: true });
  area.select();
  area.setSelectionRange(0, value.length);
  retry.addEventListener('click', () => {
    if (!legacyCopyText(value)) {
      // Stay on the manual path: keep the text selected for a long-press or ⌘C.
      area.focus({ preventScroll: true });
      area.select();
      area.setSelectionRange(0, value.length);
      setMessage(hint, 'Copy is still blocked. Select the text below and copy it manually.');
      return;
    }
    close('copied');
    onCopied?.();
  });
  return { root, area, close, closed };
}
