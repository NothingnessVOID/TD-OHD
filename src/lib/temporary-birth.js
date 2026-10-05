import { listPeople, savePerson, birthFromPerson } from './people.js';

export function validTemporaryBirth(birth) {
  if (!birth?.name?.trim() || /^(?:Person B|Person \d+|Unnamed)$/i.test(birth.name.trim())) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth.birthDate || '') || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(birth.birthTime || '')) return false;
  const day = new Date(`${birth.birthDate}T00:00:00Z`);
  if (!Number.isFinite(day.valueOf()) || day.toISOString().slice(0, 10) !== birth.birthDate) return false;
  return Number.isFinite(birth.timezone) && birth.timezone >= -14 && birth.timezone <= 14;
}

function identity(birth) {
  // A name is part of identity; coincident births do not imply the same person.
  return JSON.stringify([(birth.name || '').trim(), birth.birthDate, birth.birthTime.length === 5 ? `${birth.birthTime}:00` : birth.birthTime, !!birth.timeUnknown,
    birth.timezone]);
}

/** Called only after a successful comparison/group result, through PeopleStore. */
export function saveTemporaryBirth(birth, store = { list: listPeople, save: savePerson }) {
  if (!validTemporaryBirth(birth)) return null;
  const existing = store.list().find(person => {
    const previous = birthFromPerson(person);
    return identity(previous) === identity(birth) &&
      (!previous.location?.iana || !birth.location?.iana || previous.location.iana === birth.location.iana);
  });
  return store.save({ ...birth, location: birth.location || (existing ? birthFromPerson(existing).location : null),
    name: birth.name.trim(), id: existing?.id || birth.id });
}
