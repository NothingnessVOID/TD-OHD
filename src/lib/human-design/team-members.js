import { createUuid } from '../uuid.js';

/** Team relationship identity is independent of names, birth data and array order. */
export class TeamMemberError extends Error {
  constructor(code, message, path = null) {
    super(message);
    this.name = 'TeamMemberError';
    this.code = code;
    this.path = path;
  }
}

const nonempty = value => typeof value === 'string' && value.trim().length > 0;

export function createMember({ personId = null, displayName, origin, memberId } = {}) {
  if (personId !== null && !nonempty(personId)) {
    throw new TeamMemberError('INVALID_PERSON_ID', 'personId must be a nonempty string or null.', 'personId');
  }
  if (!nonempty(displayName)) {
    throw new TeamMemberError('INVALID_DISPLAY_NAME', 'A member needs a display name.', 'displayName');
  }
  if (origin !== 'saved' && origin !== 'quick') {
    throw new TeamMemberError('INVALID_ORIGIN', 'origin must be saved or quick.', 'origin');
  }
  if (origin === 'saved' && personId === null) {
    throw new TeamMemberError('INVALID_PERSON_ID', 'A saved member needs a personId.', 'personId');
  }
  if (memberId === undefined) {
    try { memberId = createUuid(); }
    catch { throw new TeamMemberError('ID_UNAVAILABLE', 'Secure UUID generation is unavailable.', 'memberId'); }
  }
  if (!nonempty(memberId)) {
    throw new TeamMemberError('INVALID_MEMBER_ID', 'memberId must be a nonempty string.', 'memberId');
  }
  return { memberId, personId, displayName: displayName.trim(), origin };
}

/** Strict app birth shape: actual Gregorian date, HH:MM, numeric UTC offset. */
export function validateBirth(birth) {
  if (!birth || typeof birth !== 'object' || Array.isArray(birth)) return false;
  if (typeof birth.birthDate !== 'string' || birth.birthDate.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(birth.birthDate)) return false;
  const [year, month, day] = birth.birthDate.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  if (day > [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]) return false;
  if (typeof birth.birthTime !== 'string' || birth.birthTime.length !== 5 || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birth.birthTime)) return false;
  return typeof birth.timezone === 'number' && Number.isFinite(birth.timezone) && birth.timezone >= -14 && birth.timezone <= 14;
}

/** Return a new array; duplicates are determined solely by PeopleStore id. */
export function addSavedMember(members, person) {
  if (!Array.isArray(members)) throw new TeamMemberError('INVALID_MEMBERS', 'members must be an array.', 'members');
  const memberIds = new Set();
  const personIds = new Set();
  for (const item of members) {
    if (!item || typeof item !== 'object' || !nonempty(item.memberId)) throw new TeamMemberError('INVALID_MEMBERS', 'Existing members need stable memberIds.', 'members');
    const member = createMember(item);
    if (memberIds.has(member.memberId)) throw new TeamMemberError('DUPLICATE_MEMBER_ID', 'Duplicate memberId.', 'memberId');
    if (member.personId !== null && personIds.has(member.personId)) throw new TeamMemberError('DUPLICATE_PERSON_ID', 'The person is already in this team.', 'personId');
    memberIds.add(member.memberId);
    if (member.personId !== null) personIds.add(member.personId);
  }
  if (!person || !nonempty(person.id)) throw new TeamMemberError('INVALID_PERSON_ID', 'A saved person needs an id.', 'personId');
  if (personIds.has(person.id)) throw new TeamMemberError('DUPLICATE_PERSON_ID', 'The person is already in this team.', 'personId');
  const birth = { ...person, timezone: person.timezone ?? person.location?.timezone };
  if (!validateBirth(birth)) throw new TeamMemberError('INVALID_BIRTH', 'The saved person has invalid birth data.', 'birth');
  const member = createMember({ personId: person.id, displayName: person.name, origin: 'saved' });
  if (memberIds.has(member.memberId)) throw new TeamMemberError('DUPLICATE_MEMBER_ID', 'Generated memberId collides with an existing member.', 'memberId');
  return [...members, member];
}
