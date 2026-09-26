import { shareFields } from '../lib/share.js';
import { esc } from '../lib/format.js';
import { t } from '../lib/i18n.js';

/** A pre-copy disclosure of precisely what the URL carries. */
export function openSharePreview(birth, onCopy) {
  document.getElementById('share-preview-dialog')?.remove();
  const dialog = document.createElement('dialog');
  dialog.id = 'share-preview-dialog';
  dialog.className = 'share-preview-dialog';
  const render = anonymous => {
    const fields = shareFields(birth, { anonymous });
    const rows = Object.entries(fields).filter(([,value]) => value !== null).map(([key,value]) =>
      `<div class="share-field"><span>${esc(t(key))}</span><strong>${esc(Array.isArray(value) ? value.join(', ') : String(value))}</strong></div>`).join('');
    dialog.innerHTML = `<form method="dialog"><button class="share-close" aria-label="${esc(t('Close'))}">×</button></form>
      <h2>${t('Share chart')}</h2>
      <p>${t('This link contains the following birth details:')}</p>
      <label><input type="checkbox" id="share-anonymous" ${anonymous ? 'checked' : ''}> ${t('Anonymous link: omit name and place')}</label>
      <div class="share-fields">${rows}</div>
      <p class="share-note">${t('The date, time and UTC offset remain in the link so the chart can be recalculated.')}</p>
      <button type="button" id="share-copy" class="btn-primary">${t('Copy chart link')}</button>`;
    dialog.querySelector('#share-anonymous').addEventListener('change', e => render(e.target.checked));
    dialog.querySelector('#share-copy').addEventListener('click', async e => {
      try { await onCopy({ anonymous }); e.target.textContent = t('Link copied ✓'); }
      catch { e.target.textContent = t('Copy blocked — use the address bar URL'); }
    });
  };
  render(false);
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.appendChild(dialog);
  dialog.showModal();
}
