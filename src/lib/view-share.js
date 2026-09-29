/** The header's share menu follows the visible view, not the last rendered chart. */
import { t } from './i18n.js';
import { birthToParams, connectionUrl, shareUrl } from './share.js';

const menu = () => document.getElementById('chart-share-menu');
const actions = () => menu().querySelector('.chart-share-actions');

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
    const theme = getComputedStyle(document.documentElement);
    context.fillStyle = theme.getPropertyValue('--bg').trim() || '#faf8f5';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = theme.getPropertyValue('--text').trim() || '#1a1714';
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
  const theme = getComputedStyle(document.documentElement);
  const width = Math.ceil(root.getBoundingClientRect().width);
  const height = Math.ceil(root.getBoundingClientRect().height);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(24_000_000 / Math.max(width * height, 1)));
  const blob = await toBlob(root, {
    backgroundColor: theme.getPropertyValue('--bg').trim() || '#faf8f5',
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

export function configureShareMenu(view, birth) {
  const shareMenu = menu();
  const available = view === 'library' || Boolean(birth);
  shareMenu.open = false;
  shareMenu.classList.toggle('hidden', !available);
  if (!available) {
    actions().replaceChildren();
    return;
  }

  actions().innerHTML = `${view === 'chart' ? `<button id="share-chart" class="btn-secondary btn-small">${t('Copy chart link')}</button>` : ''}
    <button id="save-image" class="btn-secondary btn-small">${t('Save image')}</button>
    ${view === 'chart' ? `<button id="invite-compare" class="btn-secondary btn-small">${t('Invite to compare')}</button>` : ''}`;

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
