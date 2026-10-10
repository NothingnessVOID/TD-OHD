// Explicit development-only fixture import. The application never imports this module.
const PROFILE_LIMIT = 50;

export function importTestPeople(fixture, { listPeople, savePerson }) {
  if (fixture?.version !== 1 || fixture.fictional !== true || !Array.isArray(fixture.people) || fixture.people.length !== 10) {
    throw new Error('Expected the version 1 fixture containing ten fictional people.');
  }
  const ids = new Set();
  for (const birth of fixture.people) {
    if (!/^td-ohd-fictional-\d{2}$/.test(birth.id) || ids.has(birth.id)
      || typeof birth.name !== 'string' || !birth.name.includes('虚构')
      || !/^\d{4}-\d{2}-\d{2}$/.test(birth.birthDate)
      || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birth.birthTime)
      || !Number.isFinite(birth.timezone) || birth.timezone < -12 || birth.timezone > 14
      || !birth.location?.iana) {
      throw new Error('Invalid fictional birth record; nothing was imported.');
    }
    const date = new Date(`${birth.birthDate}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== birth.birthDate) {
      throw new Error('Invalid birth date; nothing was imported.');
    }
    ids.add(birth.id);
  }
  const existing = listPeople();
  const existingIds = new Set(existing.map(person => person.id));
  const missing = fixture.people.filter(birth => !existingIds.has(birth.id));
  if (existing.length + missing.length > PROFILE_LIMIT) {
    throw new Error('The profile library has a 50-person limit; no existing people were changed.');
  }
  // Skip existing IDs entirely, including user-edited fixtures. Never overwrite.
  for (const birth of missing) savePerson(structuredClone(birth));
  const savedIds = new Set(listPeople().map(person => person.id));
  if (missing.some(birth => !savedIds.has(birth.id))) {
    throw new Error('Some people were not saved. Check browser storage and retry; existing IDs are skipped.');
  }
  return { added: missing.length, skipped: fixture.people.length - missing.length, total: savedIds.size };
}
