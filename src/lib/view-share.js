/** The header's share menu follows the visible view, not the last rendered chart. */
import { formatChartDataExport } from './chart-data-export.js';
import { t } from './i18n.js';
import { birthToParams, connectionUrl, shareUrl } from './share.js';

const menu = () => document.getElementById('chart-share-menu');
const actions = () => menu().querySelector('.chart-share-actions');
let dismissalBound = false;

function siteColor(token) {
  const color = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (!color) throw new Error(`Missing appearance token: ${token}`);
  return color;
}

function bindShareMenuDismissal() {
  if (dismissalBound) return;
  dismissalBound = true;
  document.addEventListener('click', event => {
    const shareMenu = menu();
    if (shareMenu?.open && !shareMenu.contains(event.target)) shareMenu.open = false;
  });
  document.addEventListener('keydown', event => {
    const shareMenu = menu();
    if (event.key !== 'Escape' || !shareMenu?.open) return;
    shareMenu.open = false;
    shareMenu.querySelector('summary')?.focus();
  });
}

function downloadPng(blob, filename) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

async function renderLocalChartPng() {
  const original = document.querySelector('#bodygraph-container svg');
  if (!original) throw new Error('Bodygraph unavailable');
  const clone = original.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const originals = [original, ...original.querySelectorAll('*')];
  const copies = [clone, ...clone.querySelectorAll('*')];
  for (let index = 0; index < originals.length; index++) {
    const style = getComputedStyle(originals[index]);
    for (const property of ['fill', 'stroke', 'stroke-width', 'opacity', 'color', 'font-family', 'font-size', 'font-weight', 'display']) {
      const value = style.getPropertyValue(property);
      if (value) copies[index].style.setProperty(property, value);
    }
  }
  // Capture the finished graph even when the user exports during its entrance animation.
  clone.querySelectorAll('.bg-reveal, .bg-reveal-paths').forEach(node => {
    node.classList.remove('bg-reveal', 'bg-reveal-paths');
    node.style.setProperty('animation', 'none');
    node.style.setProperty('opacity', '1');
  });
  const svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = svgUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const context = canvas.getContext('2d');
    context.fillStyle = siteColor('--bg');
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = siteColor('--text');
    context.textAlign = 'center';
    context.font = '52px sans-serif';
    context.fillText('Human Design', 540, 150);
    const ratio = Math.min(900 / image.width, 1450 / image.height);
    const width = image.width * ratio;
    const height = image.height * ratio;
    context.drawImage(image, (1080 - width) / 2, 280 + (1450 - height) / 2, width, height);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png'));
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

async function renderViewPng(view) {
  const root = document.getElementById(`${view}-view`);
  if (!root || root.classList.contains('hidden')) throw new Error('View unavailable');
  // Keep the screenshot local. Loading the renderer on demand avoids adding it
  // to the initial chart, transit, and timeline bundles.
  const { toBlob } = await import('html-to-image');
  const width = Math.ceil(root.getBoundingClientRect().width);
  const height = Math.ceil(root.getBoundingClientRect().height);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(24_000_000 / Math.max(width * height, 1)));
  const blob = await toBlob(root, {
    backgroundColor: siteColor('--bg'),
    pixelRatio,
    skipFonts: true,
    // Export the visible view as it is, including its current scroll position.
    width,
    height,
  });
  if (!blob) throw new Error('PNG export failed');
  return blob;
}

export async function saveViewImage(view) {
  downloadPng(await renderViewPng(view), `td-ohd-${view}.png`);
}

function feedback(button, message, reset) {
  button.textContent = t(message);
  setTimeout(() => { if (button.isConnected) button.textContent = t(reset); }, 2500);
}

export function configureShareMenu(view, currentData, providers = {}) {
  const birth = currentData?.birth;
  const chart = currentData?.chart;
  const copyDataAvailable = Boolean(chart) && ['chart', 'transits', 'timeline'].includes(view);
  bindShareMenuDismissal();
  const shareMenu = menu();
  const available = view === 'library' || Boolean(birth);
  shareMenu.open = false;
  shareMenu.classList.toggle('hidden', !available);
  if (!available) {
    actions().replaceChildren();
    return;
  }

  actions().innerHTML = `${view === 'chart' ? `<button id="share-chart" class="btn-secondary btn-small">${t('Copy chart link')}</button>` : ''}
    ${copyDataAvailable ? `<button id="copy-data" class="btn-secondary btn-small">${t('Copy data')}</button>` : ''}
    <button id="save-image" class="btn-secondary btn-small">${t('Save image')}</button>
    ${view === 'chart' ? `<button id="invite-compare" class="btn-secondary btn-small">${t('Invite to compare')}</button>` : ''}`;

  if (copyDataAvailable) {
    document.getElementById('copy-data').addEventListener('click', async event => {
      const button = event.currentTarget;
      const snapshot = view === 'chart' ? null : providers[view]?.();
      if (view !== 'chart' && !snapshot) {
        feedback(button, 'Transit data is not ready yet', 'Copy data');
        return;
      }
      try {
        // Deliberately pass only computed results, never the birth object.
        const text = formatChartDataExport({ chart, transit: snapshot?.activations, transitMoment: snapshot });
        await navigator.clipboard.writeText(text);
        feedback(button, 'Data copied ✓', 'Copy data');
      } catch {
        feedback(button, 'Copy blocked — please try again', 'Copy data');
      }
    });
  }

  if (view === 'chart') {
    document.getElementById('share-chart').addEventListener('click', async event => {
      const button = event.currentTarget;
      try {
        await navigator.clipboard.writeText(shareUrl(birth));
        feedback(button, 'Link copied ✓', 'Copy chart link');
      } catch {
        feedback(button, 'Copy blocked — please try again', 'Copy chart link');
      }
    });
    document.getElementById('invite-compare').addEventListener('click', async event => {
      const button = event.currentTarget;
      try {
        await navigator.clipboard.writeText(connectionUrl(birth));
        feedback(button, 'Invite copied ✓', 'Invite to compare');
      } catch {
        feedback(button, 'Copy blocked — please try again', 'Invite to compare');
      }
    });
  }

  document.getElementById('save-image').addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = t('Preparing…');
    try {
      if (view !== 'chart') {
        await saveViewImage(view);
      } else if (['static', 'desktop'].includes(import.meta.env.MODE)) {
        downloadPng(await renderLocalChartPng(), 'human-design-chart.png');
      } else {
        try {
          const params = birthToParams(birth);
          params.set('format', 'story');
          if (document.documentElement.getAttribute('data-theme') === 'dark') params.set('theme', 'dark');
          const response = await fetch(`/og/card.png?${params}`);
          if (!response.ok || !response.headers.get('content-type')?.startsWith('image/png')) throw new Error('render failed');
          downloadPng(await response.blob(), 'human-design-chart.png');
        } catch {
          downloadPng(await renderLocalChartPng(), 'human-design-chart.png');
        }
      }
      feedback(button, 'Saved ✓', 'Save image');
    } catch {
      feedback(button, 'Image unavailable here', 'Save image');
    } finally {
      button.disabled = false;
    }
  });
}
