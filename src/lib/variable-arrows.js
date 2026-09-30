/** Fixed presentation slots; directions come from the chart contract, never notation. */
export const VARIABLE_POSITIONS = Object.freeze([
  Object.freeze({ key: 'determination', position: 'top-left', label: 'Determination', source: 'design.sun' }),
  Object.freeze({ key: 'motivation', position: 'top-right', label: 'Motivation', source: 'personality.sun' }),
  Object.freeze({ key: 'environment', position: 'bottom-left', label: 'Environment', source: 'design.northNode' }),
  Object.freeze({ key: 'perspective', position: 'bottom-right', label: 'Perspective', source: 'personality.northNode' })
]);

export function variableDirection(slot) {
  if (slot?.arrow === 'left' || slot?.arrow === 'right') return slot.arrow;
  const tone = Number(slot?.tone);
  return Number.isInteger(tone) && tone >= 1 && tone <= 6 ? (tone <= 3 ? 'left' : 'right') : null;
}

export function variableArrows(variable) {
  return VARIABLE_POSITIONS.flatMap(item => {
    const slot = variable?.[item.key];
    const direction = variableDirection(slot);
    return direction ? [{ ...item, direction, symbol: direction === 'left' ? '←' : '→', tone: slot.tone }] : [];
  });
}

export function renderVariableArrowRow(variable, edge, translate) {
  const items = variableArrows(variable).filter(item => item.position.startsWith(edge));
  if (!items.length) return null;
  const row = document.createElement('div');
  row.className = `bg-variable-row bg-variable-${edge}`;
  for (const item of items) {
    const cell = document.createElement('div');
    cell.className = 'bg-variable-arrow';
    cell.dataset.variable = item.key;
    cell.dataset.position = item.position;
    cell.dataset.source = item.source.startsWith('design.') ? 'design' : 'personality';
    cell.dataset.direction = item.direction;
    cell.dataset.tone = item.tone ?? '';
    cell.setAttribute('aria-label', `${translate(item.label)}: ${translate(item.direction === 'left' ? 'Left — focused' : 'Right — receptive')}`);
    const label = document.createElement('span');
    label.className = 'bg-variable-label';
    label.textContent = translate(item.label);
    const arrow = document.createElement('span');
    arrow.className = 'bg-variable-symbol';
    arrow.textContent = item.symbol;
    arrow.setAttribute('aria-hidden', 'true');
    cell.append(label, arrow);
    row.appendChild(cell);
  }
  return row;
}
