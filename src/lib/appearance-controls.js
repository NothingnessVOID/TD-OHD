import { CUSTOM_TOKENS, getCustomOverrides, getHumanDesignSkin, onAppearanceChange, setHumanDesignSkin, setCustomOverride, restoreCurrentPreset, resetAppearance } from './appearance.js';
import { onLocaleChange, translatePage } from './i18n.js';

export function setupAppearanceControls() {
  const more = document.getElementById('more-menu');
  const toggle = document.getElementById('more-toggle');
  const dialog = document.getElementById('skin-settings');
  const closeMore = () => { more.open = false; document.getElementById('chart-share-menu').open = false; };
  more.addEventListener('toggle', () => toggle.setAttribute('aria-expanded', String(more.open)));
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
    dialog.querySelectorAll('[data-skin-preset]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.skinPreset === getHumanDesignSkin())));
    dialog.querySelectorAll('[data-appearance-key]').forEach(input => {
      const key = input.dataset.appearanceKey;
      input.value = custom[key] ?? (key === 'gateNumberSize' ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue(CUSTOM_TOKENS[key])) : colorValue(key === 'graphBackground' ? '--hd-graph-panel-bg' : CUSTOM_TOKENS[key]));
    });
    document.getElementById('appearance-size-value').value = `${document.getElementById('appearance-gateNumberSize').value}px`;
  }
  document.getElementById('skin-settings-button').addEventListener('click', () => { closeMore(); refresh(); dialog.showModal(); });
  document.getElementById('skin-settings-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => toggle.focus());
  dialog.querySelectorAll('[data-skin-preset]').forEach(button => button.addEventListener('click', () => setHumanDesignSkin(button.dataset.skinPreset)));
  dialog.querySelectorAll('[data-appearance-key]').forEach(input => input.addEventListener('input', () => setCustomOverride(input.dataset.appearanceKey,input.value)));
  document.getElementById('appearance-restore').addEventListener('click',restoreCurrentPreset);
  document.getElementById('appearance-reset').addEventListener('click',resetAppearance);
  onAppearanceChange(() => { if (dialog.open) refresh(); });
  onLocaleChange(() => translatePage(dialog));
}
