/** Pure time-to-pixel viewport math. Ranges and intervals use [start, end). */
import { DAY } from './core.js';

const SECOND = 1000;

function validRange({ start, end }) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new RangeError('Invalid viewport range');
  }
  return end - start;
}

function validRatio(ratio) {
  if (!Number.isFinite(ratio)) throw new RangeError('Invalid viewport ratio');
}

/** Map a relative position to an instant; positions outside 0..1 extrapolate. */
export function instantAt(range, ratio) {
  const span = validRange(range);
  validRatio(ratio);
  return range.start + span * ratio;
}

/** Map an instant to a relative position; offscreen instants remain offscreen. */
export function ratioAt(range, instant) {
  const span = validRange(range);
  if (!Number.isFinite(instant)) throw new RangeError('Invalid viewport instant');
  return (instant - range.start) / span;
}

/** factor > 1 zooms in. Keep anchorRatio fixed to the nearest whole second. */
export function zoomWindow(range, factor, anchorRatio = 0.5,
  { minSpan = 60 * 60 * SECOND, maxSpan = 28 * DAY } = {}) {
  const span = validRange(range);
  if (!Number.isFinite(factor) || factor <= 0 ||
      !Number.isFinite(minSpan) || !Number.isFinite(maxSpan) ||
      minSpan < SECOND || maxSpan < minSpan ||
      !Number.isFinite(anchorRatio) || anchorRatio < 0 || anchorRatio > 1) {
    throw new RangeError('Invalid viewport zoom');
  }
  const nextSpan = Math.round(Math.max(minSpan, Math.min(maxSpan, span / factor)) / SECOND) * SECOND;
  const anchor = instantAt(range, anchorRatio);
  const start = Math.round((anchor - nextSpan * anchorRatio) / SECOND) * SECOND;
  return { start, end: start + nextSpan };
}

/** Shift by a signed duration, rounded to a whole second; preserve exact span. */
export function panWindow(range, deltaMs) {
  validRange(range);
  if (!Number.isFinite(deltaMs)) throw new RangeError('Invalid viewport pan');
  const shift = Math.round(deltaMs / SECOND) * SECOND;
  return { start: range.start + shift, end: range.end + shift };
}

/** Keep a viewport inside calculated [start, end), preserving its span where possible. */
export function clampWindow(range, bounds) {
  const span = validRange(range);
  const boundSpan = validRange(bounds);
  if (span >= boundSpan) return { start: bounds.start, end: bounds.end };
  const start = Math.max(bounds.start, Math.min(range.start, bounds.end - span));
  return { start, end: start + span };
}

/** Ease an off-center cursor toward center as the user pans, then follow it. */
export function panTimeline(range, selected, deltaMs, bounds) {
  if (!Number.isFinite(selected)) throw new RangeError('Invalid viewport instant');
  const span = validRange(range);
  validRange(bounds);
  if (!Number.isFinite(deltaMs)) throw new RangeError('Invalid viewport pan');
  const nextSelected = Math.max(bounds.start, Math.min(bounds.end - SECOND,
    Math.round((selected + deltaMs) / SECOND) * SECOND));
  const actualDelta = nextSelected - selected;
  const direction = Math.sign(actualDelta);
  const distance = Math.abs(actualDelta);
  const offset = direction * (selected - (range.start + span / 2));
  // When moving toward center, hold the view until the cursor catches up.
  // When moving away from center, let the view travel at most twice as fast
  // until the cursor catches up. Both paths avoid a sudden recentering jump.
  const shift = direction * Math.round((offset > 0
    ? distance + Math.min(distance, offset)
    : Math.max(0, distance + offset)) / SECOND) * SECOND;
  const nextRange = clampWindow({ start: range.start + shift, end: range.end + shift }, bounds);
  return {
    range: nextRange,
    selected: nextSelected
  };
}

/** Crop an interval to the viewport, preserving its source and prior clip flags. */
export function clipInterval(interval, range) {
  validRange(range);
  validRange(interval);
  const start = Math.max(interval.start, range.start);
  const end = Math.min(interval.end, range.end);
  if (end <= start) return null;
  return {
    ...interval,
    start,
    end,
    clippedStart: Boolean(interval.clippedStart || interval.start < range.start),
    clippedEnd: Boolean(interval.clippedEnd || interval.end > range.end)
  };
}
