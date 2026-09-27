/** Pure, shared birth-data boundary. The engine accepts decimal hours, but
 * every stored and shared natal time is an explicit civil minute. */
export class BirthInputError extends Error {
  constructor(code) { super(code); this.name = 'BirthInputError'; this.code = code; }
}

export function normaliseBirth(birth, { confirmMinute = false } = {}) {
  if (!birth || typeof birth !== 'object') throw new BirthInputError('Birth data is missing.');
  const date = birth.birthDate;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BirthInputError('Enter a valid birth date.');
  const [year, month, day] = date.split('-').map(Number);
  const checked = new Date(Date.UTC(year, month - 1, day));
  if (checked.getUTCFullYear() !== year || checked.getUTCMonth() !== month - 1 || checked.getUTCDate() !== day)
    throw new BirthInputError('Enter a valid birth date.');
  const unknown = birth.timeUnknown === true;
  let time = birth.birthTime;
  if (unknown) time = '12:00'; // a calculation reference, never a claimed birth time
  else {
    if (typeof time !== 'string') throw new BirthInputError('Enter a birth time or mark it unknown.');
    const parts = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/.exec(time);
    if (!parts || Number(parts[1]) > 23) throw new BirthInputError('Enter a valid birth time.');
    if (parts[3] && parts[3] !== '00' && !confirmMinute)
      throw new BirthInputError('Confirm the birth minute before discarding seconds.');
    time = `${parts[1].padStart(2, '0')}:${parts[2]}`;
  }
  const timezone = birth.timezone;
  if (typeof timezone !== 'number' || !Number.isFinite(timezone) || timezone < -12 || timezone > 14)
    throw new BirthInputError('Enter a valid birth UTC offset.');
  const location = birth.location;
  if (location) {
    const validCoord = (value, max) => value == null ||
      (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max);
    if (!validCoord(location.lat, 90) || !validCoord(location.lon, 180) ||
        (location.lat == null) !== (location.lon == null))
      throw new BirthInputError('Enter valid birth coordinates.');
    if (location.iana) {
      try { new Intl.DateTimeFormat('en', { timeZone: location.iana }); }
      catch { throw new BirthInputError('Enter a valid IANA time zone.'); }
    }
  }
  return { ...birth, birthDate: date, birthTime: time, timeUnknown: unknown, timezone,
    ...(location ? { location: { ...location, timezone } } : {}) };
}
