// Presentation-only WCAG contrast helpers. Source fills are never changed.
export function luminance(rgb) {
  const linear = rgb.slice(0, 3).map(n => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}
export function contrastRatio(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
export const mixRGB = (a, b, amount) => a.map((v, i) => Math.round(v * (1 - amount) + b[i] * amount));
export const rgbCSS = rgb => `rgb(${rgb.slice(0, 3).join(', ')})`;
export function readableRGB(preferred, backgrounds, toward = [0, 0, 0]) {
  const passes = rgb => backgrounds.every(bg => contrastRatio(rgb, bg) >= 4.5);
  if (passes(preferred)) return preferred;
  for (const target of [toward, [0, 0, 0], [255, 255, 255]]) {
    for (let step = 1; step <= 100; step++) {
      const candidate = mixRGB(preferred, target, step / 100);
      if (passes(candidate)) return candidate;
    }
  }
  return [[0, 0, 0], [255, 255, 255]].sort((a, b) =>
    Math.min(...backgrounds.map(bg => contrastRatio(b, bg))) - Math.min(...backgrounds.map(bg => contrastRatio(a, bg))))[0];
}
// Canvas resolves the browser's supported CSS color syntax, including color-mix.
let context, probe;
export function resolveRGB(color) {
  if (!probe) {
    probe = document.createElement('span');
    probe.hidden = true;
    document.documentElement.appendChild(probe);
  }
  probe.style.color = '';
  probe.style.color = color || '#000000';
  color = getComputedStyle(probe).color;
  context ||= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = '#000000';
  context.fillStyle = color || '#000000';
  context.fillRect(0, 0, 1, 1);
  return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
}
export function readableColor(preferred, backgrounds, toward = '#111111') {
  const original = resolveRGB(preferred);
  const result = readableRGB(original, backgrounds.map(resolveRGB), resolveRGB(toward));
  return result.every((n, i) => n === original[i]) ? preferred : rgbCSS(result);
}
export function applySourceTextColors(root) {
  if (typeof getComputedStyle !== 'function' || typeof document.createElement !== 'function') return;
  const style = getComputedStyle(root);
  const read = name => style.getPropertyValue(name).trim();
  const backgrounds = [read('--bg'), read('--bg-elevated')];
  const text = read('--text');
  for (const [name, token] of Object.entries({ personality: '--hd-personality', design: '--hd-design', transit: '--hd-transit-text', birthPersonality: '--hd-birth-personality', birthDesign: '--hd-birth-design', natal: '--hd-overlay-natal' })) {
    const source = read(token) || read(name === 'birthPersonality' ? '--hd-personality' : '--hd-design');
    root.style.setProperty(`--source-${name}-text`, readableColor(source, name === 'transit' ? [...backgrounds, read('--hd-transit-soft')] : backgrounds, text));
    root.style.setProperty(`--source-${name}-tooltip-text`, readableColor(source, [read('--hd-tooltip-bg')], text));
  }
}
