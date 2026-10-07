import { CUSTOM_TOKENS, getCustomOverrides, getCenterPalette, onAppearanceChange, setCenterPalette, setCustomOverride, restoreCurrentSkin } from './appearance.js';
import { onLocaleChange, translatePage } from './i18n.js';

export function setupAppearanceControls() {
  const more = document.getElementById('more-menu');
  const toggle = document.getElementById('more-toggle');
  const dialog = document.getElementById('skin-settings');
  const share = document.getElementById('chart-share-menu');
  const language = document.getElementById('language-menu');
  const closeMore = () => { more.open = false; share.open = false; language.open = false; };
  more.addEventListener('toggle', () => {
    toggle.setAttribute('aria-expanded', String(more.open));
    if (!more.open) { share.open = false; language.open = false; }
  });
  share.addEventListener('toggle', () => { if (share.open) language.open = false; });
  language.addEventListener('toggle', () => { if (language.open) share.open = false; });
  document.addEventListener('click', event => { if (more.open && !more.contains(event.target)) closeMore(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && more.open) { closeMore(); toggle.focus(); }
  });
  function colorValue(token) {
    const probe = document.createElement('span');
    probe.style.color = `var(${token})`;
    probe.hidden = true; document.body.append(probe);
    const rgb = getComputedStyle(probe).color.match(/[\d.]+/g)?.slice(0,3).map(Number);
    probe.remove();
    return rgb?.length === 3 ? `#${rgb.map(x => Math.round(x).toString(16).padStart(2,'0')).join('')}` : '#ffffff';
  }
  function refresh() {
    const custom = getCustomOverrides();
    dialog.querySelectorAll('[data-skin-preset]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.skinPreset === getCenterPalette())));
    dialog.querySelectorAll('[data-appearance-key]').forEach(input => {
      const key = input.dataset.appearanceKey;
      input.value = custom[key] ?? (key === 'gateNumberSize' ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue(CUSTOM_TOKENS[key])) : colorValue(key === 'graphBackground' ? '--hd-graph-panel-bg' : CUSTOM_TOKENS[key]));
    });
  }
  document.getElementById('skin-settings-button').addEventListener('click', () => { closeMore(); refresh(); dialog.showModal(); });
  document.getElementById('skin-settings-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => toggle.focus());
  dialog.querySelectorAll('[data-skin-preset]').forEach(button => button.addEventListener('click', () => setCenterPalette(button.dataset.skinPreset)));
  dialog.querySelectorAll('[data-appearance-key]').forEach(input => input.addEventListener('input', () => { if (input.validity.valid && input.value !== '') setCustomOverride(input.dataset.appearanceKey,input.value); }));
  document.getElementById('appearance-restore').addEventListener('click',restoreCurrentSkin);
  onAppearanceChange(() => { if (dialog.open) refresh(); });
  onLocaleChange(() => translatePage(dialog));
}
