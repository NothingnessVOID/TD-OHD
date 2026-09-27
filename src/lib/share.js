/**
 * Shareable chart links.
 *
 * Encodes birth data in URL query params so a chart can be bookmarked,
 * shared, or opened directly:
 *
 *   ?d=1990-06-15&t=14:30&tz=-6
 *
 * Only `d` is required; everything else has sensible fallbacks.
 */

export function birthToParams(birth, { includeIdentity = false } = {}) {
  const p = new URLSearchParams();
  p.set('d', birth.birthDate);
  if (birth.birthTime) p.set('t', birth.birthTime);
  if (birth.timezone !== undefined && birth.timezone !== null) p.set('tz', String(birth.timezone));
  if (includeIdentity && birth.name) p.set('n', birth.name);
  if (birth.timeUnknown) p.set('tu', '1');
  if (includeIdentity && birth.location) {
    if (birth.location.name) p.set('place', birth.location.name);
    if (birth.location.lat !== undefined && birth.location.lat !== null) p.set('lat', String(birth.location.lat));
    if (birth.location.lon !== undefined && birth.location.lon !== null) p.set('lon', String(birth.location.lon));
    if (birth.location.iana) p.set('iana', birth.location.iana);
  }
  return p;
}

export function paramsToBirth(searchParams) {
  const p = typeof searchParams === 'string' ? new URLSearchParams(searchParams) : searchParams;
  const d = p.get('d');
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const dateValue = Date.parse(`${d}T00:00:00Z`);
  if (!Number.isFinite(dateValue) || new Date(dateValue).toISOString().slice(0, 10) !== d) return null;

  const t = p.get('t');
  if (t !== null && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t)) return null;
  const birthTime = t || '12:00';
  const tz = p.get('tz');
  if (tz !== null && (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(tz) ||
      !Number.isFinite(Number(tz)) || Number(tz) < -14 || Number(tz) > 14)) return null;
  const timezone = tz === null ? 0 : Number(tz);

  const coordinatePattern = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;
  if ((p.has('lat') && !coordinatePattern.test(p.get('lat'))) ||
      (p.has('lon') && !coordinatePattern.test(p.get('lon')))) return null;
  const lat = Number(p.get('lat'));
  const lon = Number(p.get('lon'));
  const hasCoords = p.has('lat') && p.has('lon') && Number.isFinite(lat) && Number.isFinite(lon);
  if (p.has('lat') !== p.has('lon') || (p.has('lat') && !hasCoords) ||
      (hasCoords && (Math.abs(lat) > 90 || Math.abs(lon) > 180))) return null;
  const placeName = p.get('place');
  const iana = p.get('iana');

  return {
    name: p.get('n') || null,
    birthDate: d,
    birthTime,
    timeUnknown: p.get('tu') === '1',
    timezone,
    location: (hasCoords || placeName || iana) ? {
      lat: hasCoords ? lat : null,
      lon: hasCoords ? lon : null,
      timezone,
      iana: iana || null,
      name: placeName || null
    } : null
  };
}

/** Full shareable URL for the current page. */
export function shareUrl(birth) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?${birthToParams(birth)}`;
}

/**
 * A "compare designs with me" invite. Opening it sets the sender as the other
 * person and walks the recipient straight to their connection chart (the dyad
 * loop). The sender's birth is the payload; `connect=1` flips the boot flow.
 */
export function connectionUrl(birth) {
  const p = birthToParams(birth);
  p.set('connect', '1');
  return `${window.location.origin}${window.location.pathname}?${p}`;
}
