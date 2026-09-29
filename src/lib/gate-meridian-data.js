import records from './gate-meridian-acupoints.json' with { type: 'json' };

export function gateMeridianAcupoint(gate) {
  if (typeof gate !== 'number' && typeof gate !== 'string') return null;
  const number = Number(gate);
  if (!Number.isInteger(number) || number < 1 || number > 64) return null;
  if (typeof gate === 'string' && String(number) !== gate) return null;
  return records[String(number)] ?? null;
}
