/** One vector vocabulary for computed Penta coverage states; no coverage logic here.
 * Filled endpoints = one contributor; filled + outlined = distinct contributors.
 * Both combines the single-contributor rail with the shared-contributor rail.
 */
const filled = (x, y) => `<circle cx="${x}" cy="${y}" r="2.5" fill="currentColor"/>`;
const outlined = (x, y) => `<circle cx="${x}" cy="${y}" r="2.5"/>`;
const rail = y => `<path d="M6.5 ${y}H17.5"/>`;
const symbols = Object.freeze({
 absent: `<path d="M6.5 12H9M15 12H17.5"/>${outlined(4,12)}${outlined(20,12)}`,
 selfComplete: `${rail(12)}${filled(4,12)}${filled(20,12)}`,
 crossMemberOnly: `${rail(12)}${filled(4,12)}${outlined(20,12)}<circle cx="12" cy="12" r="2" fill="var(--bg-elevated)"/>`,
 both: `${rail(7)}${filled(4,7)}${filled(20,7)}${rail(17)}${filled(4,17)}${outlined(20,17)}<circle cx="12" cy="17" r="2" fill="var(--bg-elevated)"/>`
});
export function renderPentaStateSymbol(state, { x = 0, y = 0, size = 24 } = {}) {
 if (!Object.hasOwn(symbols, state)) return '';
 return `<svg class="penta-status-icon" data-penta-state="${state}" x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${symbols[state]}</svg>`;
}
