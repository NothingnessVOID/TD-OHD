/**
 * Authority icons — one hand-drawn glyph per authority kind.
 *
 * The nine energy-centre shapes read poorly at 40px and say nothing about
 * HOW the authority works, so each icon pictures its mechanic instead:
 * emotional = waves over time, sacral = response ripples, splenic = the
 * intuitive flash, ego = will diamond (solid when manifested, radiating
 * when projected), self-projected = direction from the G, mental = the
 * questioning voice, lunar = the cycle. Stroke-only, currentColor, so
 * skins and card contexts colour them for free.
 */
const ICONS = {
  // Two tidal waves: clarity arrives and recedes before you decide.
  emotional: '<path d="M3 9c1.8-2 3.6-2 5.4 0s3.6 2 5.4 0 3.6-2 5.4 0"/><path d="M3 15c1.8-2 3.6-2 5.4 0s3.6 2 5.4 0 3.6-2 5.4 0"/>',
  // Ripples answering a touch: it responds, it never initiates.
  sacral: '<circle cx="12" cy="12" r="2.2"/><path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6"/><path d="M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4"/>',
  // One flash: instant, body-level yes or no.
  splenic: '<path d="M13.6 2.5 5.5 13.8h5.2L9.8 21.5 18.5 9.8h-5.6l.7-7.3Z"/>',
  // Filled will diamond: the manifested commitment speaks first.
  egoManifested: '<path d="M12 3.2 20.8 12 12 20.8 3.2 12 12 3.2Z"/><circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none"/>',
  // Open will diamond with rays: the projected voice must be heard first.
  egoProjected: '<path d="M12 5.4 18.6 12 12 18.6 5.4 12 12 5.4Z"/><path d="M12 1.6v2M12 20.4v2M1.6 12h2M20.4 12h2"/>',
  // G centre with direction rays: the self projects where it belongs.
  selfProjected: '<circle cx="12" cy="12" r="6.2"/><path d="M12 1.8v2.8M12 19.4v2.8M1.8 12h2.8M19.4 12h2.8"/>',
  // A questioning voice bubble: the mind asks out loud until it hears itself.
  mental: '<path d="M4.2 7A2.8 2.8 0 0 1 7 4.2h10A2.8 2.8 0 0 1 19.8 7v6.4a2.8 2.8 0 0 1-2.8 2.8h-6.3L7 19.6v-3.4h-.2A2.8 2.8 0 0 1 4.2 13.4V7Z"/><path d="M9 10h.01M12 10h.01M15 10h.01"/>',
  // Crescent plus turning dots: one full lunar cycle before certainty.
  lunar: '<path d="M20.2 14.6A8.6 8.6 0 0 1 9.6 3.8a8.6 8.6 0 1 0 10.6 10.8Z"/><circle cx="17.6" cy="6.4" r="1" fill="currentColor" stroke="none"/><circle cx="20" cy="9.6" r="0.7" fill="currentColor" stroke="none"/>'
};

/** Fallback for unmapped ids: a calm open ring — an authority worth waiting on. */
const FALLBACK = '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>';

export function authorityIcon(id) {
  return `<svg class="pc-authority-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[id] || FALLBACK}</svg>`;
}
