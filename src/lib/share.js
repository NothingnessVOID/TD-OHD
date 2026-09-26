/**
 * Shareable chart links.
 *
 * Encodes birth data in URL query params so a chart can be bookmarked,
 * shared, or opened directly:
 *
 *   ?d=1990-06-15&t=14:30&tz=-6&n=Alex&place=Denver,+Colorado,+United+States
 *    &lat=39.7392&lon=-104.9847&iana=America/Denver
 *
 * A date, explicit minute (or unknown-time flag), and UTC offset are required.
 */
import { normaliseBirth } from './birth-input.js';

export function birthToParams(birth, { anonymous = false } = {}) {
  birth = normaliseBirth(birth);
  const p = new URLSearchParams();
  p.set('d', birth.birthDate);
  if (birth.birthTime) p.set('t', birth.birthTime);
  if (birth.timezone !== undefined && birth.timezone !== null) p.set('tz', String(birth.timezone));
  if (birth.name && !anonymous) p.set('n', birth.name);
  if (birth.timeUnknown) p.set('tu', '1');
  if (birth.location && !anonymous) {
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
  if (!d) return null;

  const t = p.get('t');
  const timeUnknown = p.get('tu') === '1' || t === null;
  const birthTime = timeUnknown ? '12:00' : t;
  const tz = p.get('tz');
  const timezone = tz !== null && /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(tz) ? Number(tz) : NaN;

  const lat = p.has('lat') ? Number(p.get('lat')) : null;
  const lon = p.has('lon') ? Number(p.get('lon')) : null;
  const hasCoords = lat !== null || lon !== null;
  const placeName = p.get('place');
  const iana = p.get('iana');

  return normaliseBirth({
    name: p.get('n') || null,
    birthDate: d,
    birthTime,
    timeUnknown,
    timezone,
    location: (hasCoords || placeName || iana) ? {
      lat: hasCoords ? lat : null,
      lon: hasCoords ? lon : null,
      timezone,
      iana: iana || null,
      name: placeName || null
    } : null
  });
}

/** Full shareable URL for the current page. */
export function shareUrl(birth, options = {}) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?${birthToParams(birth, options)}`;
}

export function shareFields(birth, { anonymous = false } = {}) {
  const checked = normaliseBirth(birth);
  return {
    birthDate: checked.birthDate,
    birthTime: checked.timeUnknown ? null : checked.birthTime,
    ...(checked.timeUnknown ? { timeUnknown: true } : {}),
    timezone: checked.timezone,
    ...(!anonymous ? { name: checked.name || null, place: checked.location?.name || null,
      coordinates: checked.location?.lat != null && checked.location?.lon != null
        ? [checked.location.lat, checked.location.lon] : null,
      iana: checked.location?.iana || null } : {})
  };
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
