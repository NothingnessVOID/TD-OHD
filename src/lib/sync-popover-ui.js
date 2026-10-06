import { t } from './i18n.js';
import { esc } from './format.js';

// Shared heading for account variants; actions below it remain unchanged.
export function syncPopoverHeading(title) {
  return `<div class="sync-popover-header"><div class="panel-title" data-i18n="${esc(title)}">${esc(t(title))}</div><button type="button" class="ui-icon-button sync-popover-close" data-sync-close aria-label="${esc(t('Close'))}" data-i18n-aria-label="Close">×</button></div>`;
}

export function setupSyncPopoverDismiss() {
  const popover = document.getElementById('sync-popover');
  const close = () => {
    popover.classList.add('hidden');
    document.getElementById('sync-button')?.focus({ preventScroll: true });
  };
  // Delegate so replacing anonymous/account/local markup keeps the close action.
  popover.addEventListener('click', event => {
    if (event.target.closest('[data-sync-close]')) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !popover.classList.contains('hidden')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    }
  }, { capture: true });
}
