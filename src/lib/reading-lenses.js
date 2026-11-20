// Smallest shared layer for reading-category switches: native buttons inside the
// established `.lens-switch` track. Hosts keep their own class, attribute names,
// lens list, labels and change handling; this module only renders markup.

/** @param {{className?: string, lenses: Array<[string, string]>, selectedLens: string, dataAttribute: string, aliasAttribute?: string|null}} options */
export function renderReadingLensSwitch({ className = '', lenses = [], selectedLens, dataAttribute, aliasAttribute = null } = {}) {
  const classes = ['lens-switch', className].filter(Boolean).join(' ');
  return `<div class="${classes}">${lenses
    .map(([key, label]) => `<button type="button" ${dataAttribute}="${key}"${aliasAttribute ? ` ${aliasAttribute}="${key}"` : ''} aria-pressed="${selectedLens === key}" class="${selectedLens === key ? 'active' : ''}">${label}</button>`)
    .join('')}</div>`;
}
