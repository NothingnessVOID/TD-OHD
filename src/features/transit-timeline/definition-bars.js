/**
 * Final definition-state bars (Single / Split / Triple / Quadruple).
 * Pure markup helpers shared by the timeline view and the synthetic demo.
 * No DOM, skin or language imports: callers pass translated text.
 */
export const DEFINITION_ROW_KEY = 'definition:state';
export const DEFINITION_COUNTS = Object.freeze(['1', '2', '3', '4']);
/** Below this rendered width a bar becomes a marker with a wider hit target. */
export const DEFINITION_TICK_PX = 6;

/** A bar is drawn only when the final count differs from the natal count. */
export function definitionChanged(interval, natalCount) {
  return interval.source !== String(natalCount);
}

export const definitionMessageKey = count => `definition${count}`;

export function definitionSymbol() {
  // Four nodes joined into one figure: reads as "how many pieces" at 22px.
  return '<svg class="tl-definition-symbol" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6.5 12 12l6-5.5M12 12v6"/><circle cx="6" cy="6.5" r="2.3"/><circle cx="18" cy="6.5" r="2.3"/><circle cx="12" cy="18.5" r="2.3"/><circle cx="12" cy="12" r="2.6"/></svg>';
}

/**
 * Markup for one visible interval. `left`/`width` are percentages of the
 * track; `widthPx` decides marker form. The visible body never widens past
 * the true interval: narrow intervals keep exact geometry and only gain an
 * invisible hit area, so the drawing cannot overstate their duration.
 */
export function definitionBarMarkup({ key = DEFINITION_ROW_KEY, index, count, left, width, widthPx,
  clippedStart = false, clippedEnd = false, label, title, esc }) {
  const tick = widthPx < DEFINITION_TICK_PX;
  const classes = ['tl-bar', 'tl-definition-bar', clippedStart ? 'tl-clipped-start' : '',
    clippedEnd ? 'tl-clipped-end' : '', tick ? 'tl-definition-tick' : ''].filter(Boolean).join(' ');
  // Geometry is always the true interval. A tick paints a hairline at that
  // position and gains a 14px invisible hit area from CSS (::before).
  const style = `left:${left}%;width:${width}%`;
  // The visible label is the bare count; `title` already carries the full
  // definition name plus exact timing, so it is used verbatim for both.
  // The Single bar carries a crisp white arc layer next to the colour texture.
  // It is decoration, so it is `aria-hidden` and only the Single (non-tick) bar
  // gets one. Both spans have their own class: the count owns the chip rule, the
  // arc must never inherit it.
  const arc = count === '1' && !tick
    ? '<span class="tl-definition-arcline" aria-hidden="true"></span>'
    : '';
  return `<button type="button" class="${classes}" data-source="definition" data-definition="${count}" data-key="${key}" data-interval="${index}" style="${style}" title="${esc(title)}" aria-label="${esc(title)}">${arc}<span class="tl-definition-count">${tick ? '' : esc(label)}</span></button>`;
}
