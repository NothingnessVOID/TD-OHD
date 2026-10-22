/**
 * Right-column graphic primitives (issue #34, cut 1).
 *
 * Six primitives share this file so the visual language stays one vocabulary:
 * Shape, Segbar, Ladder, Corner and (from cut 2/3) Tube and Grid. Everything
 * here is a pure string builder: no DOM, no measurement, no colors. Colors and
 * states are expressed as classes/attributes and resolved by panel-graphics.css,
 * so switching Skin never needs a JS re-render.
 *
 * Hard rules kept in this file:
 *  - a primitive never carries meaning alone; callers always print a text label
 *  - width/length encodes a real count, never a percentage
 *  - no progress rings, no decorative fills
 */

/** Parse a path's on-curve points to get a bounding box (M/L/H/V/A/Z only). */
export function pathBounds(d) {
  const tokens = String(d).match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let x = 0, y = 0, command = 'M';
  const take = () => Number(tokens.shift());
  while (tokens.length) {
    if (/[a-zA-Z]/.test(tokens[0])) command = tokens.shift();
    switch (command) {
      case 'M': case 'm': {
        const rel = command === 'm';
        const nx = take(), ny = take();
        x = rel ? x + nx : nx; y = rel ? y + ny : ny;
        command = rel ? 'l' : 'L';
        break;
      }
      case 'L': case 'l': {
        const rel = command === 'l';
        const nx = take(), ny = take();
        x = rel ? x + nx : nx; y = rel ? y + ny : ny;
        break;
      }
      case 'H': case 'h': {
        const rel = command === 'h';
        const nx = take();
        x = rel ? x + nx : nx;
        break;
      }
      case 'V': case 'v': {
        const rel = command === 'v';
        const ny = take();
        y = rel ? y + ny : ny;
        break;
      }
      case 'A': case 'a': {
        const rel = command === 'a';
        take(); take(); take(); take(); take(); // rx ry rotation large-arc sweep
        const nx = take(), ny = take();
        x = rel ? x + nx : nx; y = rel ? y + ny : ny;
        break;
      }
      case 'Z': case 'z': break;
      default: tokens.shift(); continue;
    }
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * A center silhouette normalized into a square viewBox. The path keeps its
 * source geometry; only the viewBox changes, so the glyph is the real body
 * shape and never a redrawn stand-in.
 */
export function silhouette(path, { size = 24 } = {}) {
  const box = pathBounds(path);
  if (!Number.isFinite(box.width) || box.width <= 0 || box.height <= 0) return '';
  const span = Math.max(box.width, box.height);
  const minX = box.minX - (span - box.width) / 2;
  const minY = box.minY - (span - box.height) / 2;
  return `<svg class="pg-shape" width="${size}" height="${size}" viewBox="${minX.toFixed(2)} ${minY.toFixed(2)} ${span.toFixed(2)} ${span.toFixed(2)}" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;
}

/**
 * Segbar: segment width equals a real count. The count is printed inside each
 * segment and the segment may not shrink below its own number, so a narrow
 * column never clips the digits.
 */
export function segbar(segments, { label = '', className = '' } = {}) {
  const total = segments.reduce((sum, segment) => sum + (Number(segment.count) || 0), 0);
  if (!total) {
    return `<div class="pg-segbar pg-segbar--empty ${className}" role="img" aria-label="${label}">
      <span class="pg-segbar-empty-rule" aria-hidden="true"></span></div>`;
  }
  const cells = segments.map(segment => {
    const count = Number(segment.count) || 0;
    if (!count) return '';
    return `<span class="pg-seg" data-group="${segment.key}" style="--pg-count:${count}"><span class="pg-seg-count">${count}</span></span>`;
  }).join('');
  return `<div class="pg-segbar ${className}" role="img" aria-label="${label}">${cells}</div>`;
}

/**
 * Ladder: six ticks, one active line. Two ladders stacked express Profile
 * (personality solid, design hollow) without inventing a scale.
 */
export function lineLadder({ line, state = 'personality', label = '' }) {
  const marks = [1, 2, 3, 4, 5, 6].map(step =>
    `<span class="pg-tick"${step === line ? ' data-active="true"' : ''}></span>`).join('');
  return `<span class="pg-ladder" data-ladder="${state}" role="img" aria-label="${label}">${marks}</span>`;
}

/**
 * Corner: four corner arrows. Each arrow is a direction glyph, not a score.
 * `slots` are { position, direction, label }.
 */
export function cornerArrows(slots) {
  return `<div class="pg-corners">${slots.map(slot => `
    <span class="pg-corner" data-position="${slot.position}" data-direction="${slot.direction || 'none'}" title="${slot.label}" aria-hidden="true">${slot.direction === 'left' ? '←' : slot.direction === 'right' ? '→' : '·'}</span>`).join('')}</div>`;
}

/** A cluster of dots: one dot per real item, never a fill to look busy. */
export function dotCluster(count, { className = '', label = '' } = {}) {
  const dots = Array.from({ length: count }, () => '<span class="pg-dot"></span>').join('');
  return `<span class="pg-cluster ${className}" role="img" aria-label="${label}">${dots}</span>`;
}
