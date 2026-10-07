import { SKINS } from './skin-registry.js';
import { CUSTOM_TOKENS, getCustomOverrides, getSkinId, getSkinMode, setSkin, setAutoSkin, getCenterPalette, onAppearanceChange, setCenterPalette, setCustomOverride, restoreCurrentSkin } from './appearance.js';
import { onLocaleChange, translatePage } from './i18n.js';

export function setupAppearanceControls() {
  const more = document.getElementById('more-menu');
  const toggle = document.getElementById('more-toggle');
  const dialog = document.getElementById('skin-settings');
  const share = document.getElementById('chart-share-menu');
  const language = document.getElementById('language-menu');
  // Preview is the Skin default, independent of the active page and user overrides.
  const picker = document.getElementById('skin-picker');
  function createCard(label, tagline) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'skin-card';
    const name = document.createElement('span');
    name.className = 'skin-card-name';
    name.dataset.i18n = label;
    const mode = document.createElement('span');
    mode.className = 'skin-card-mode';
    mode.dataset.i18n = tagline;
    const check = document.createElement('span');
    check.className = 'skin-card-check';
    check.textContent = '✓';
    check.setAttribute('aria-hidden', 'true');
    button.append(name, mode, check);
    return button;
  }
  function appendSkinCard(skin) {
    const button = createCard(skin.name, skin.tagline);
    button.dataset.skinId = skin.id;
    for (const [key, value] of Object.entries(skin.preview)) button.style.setProperty(`--skin-preview-${key}`, value);
    const colors = document.createElement('span');
    colors.className = 'skin-card-colors';
    colors.setAttribute('aria-hidden', 'true');
    for (const source of ['personality', 'design', 'transit']) {
      const color = document.createElement('i');
      color.style.background = `var(--skin-preview-${source})`;
      colors.append(color);
    }
    button.append(colors);
    button.addEventListener('click', () => setSkin(skin.id));
    picker.append(button);
  }
  const dawn = SKINS.find(skin => skin.id === 'default-light');
  const dusk = SKINS.find(skin => skin.id === 'default-dark');
  appendSkinCard(dawn);
  appendSkinCard(dusk);
  // Auto is a picker choice, not a Skin or an override-storage slot.
  const auto = createCard('Auto', 'Follow system');
  auto.classList.add('skin-card-auto');
  auto.dataset.skinMode = 'auto';
  for (const [mode, skin] of [['light', dawn], ['dark', dusk]]) {
    for (const key of ['surface', 'text', 'accent']) auto.style.setProperty(`--auto-preview-${mode}-${key}`, skin.preview[key]);
  }
  const autoColors = document.createElement('span');
  autoColors.className = 'skin-card-auto-colors';
  autoColors.setAttribute('aria-hidden', 'true');
  for (const mode of ['light', 'dark']) {
    const color = document.createElement('i');
    color.style.background = `var(--auto-preview-${mode}-accent)`;
    autoColors.append(color);
  }
  auto.append(autoColors);
  auto.addEventListener('click', setAutoSkin);
  picker.append(auto);
  for (const skin of SKINS.filter(skin => !['default-light', 'default-dark'].includes(skin.id))) appendSkinCard(skin);
  translatePage(dialog);
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
    const automatic = getSkinMode() === 'auto';
    picker.querySelectorAll('[data-skin-id]').forEach(button => button.setAttribute('aria-pressed', String(!automatic && button.dataset.skinId === getSkinId())));
    auto.setAttribute('aria-pressed', String(automatic));
    dialog.querySelectorAll('button[data-center-palette]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.centerPalette === getCenterPalette())));
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
  dialog.querySelectorAll('button[data-center-palette]').forEach(button => button.addEventListener('click', () => setCenterPalette(button.dataset.centerPalette)));
  dialog.querySelectorAll('[data-appearance-key]').forEach(input => input.addEventListener('input', () => { if (input.validity.valid && input.value !== '') setCustomOverride(input.dataset.appearanceKey,input.value); }));
  document.getElementById('appearance-restore').addEventListener('click',restoreCurrentSkin);
  onAppearanceChange(() => { if (dialog.open) refresh(); });
  onLocaleChange(() => translatePage(dialog));
}
