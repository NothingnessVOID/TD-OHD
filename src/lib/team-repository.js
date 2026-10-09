import { createMember } from './human-design/team-members.js';

export const TEAM_STORAGE_KEY = 'ohd-teams-v1';
export const TEAM_STORAGE_VERSION = 1;

export class TeamRepositoryError extends Error {
  constructor(code, message, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'TeamRepositoryError';
    this.code = code;
  }
}

const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const fail = (code, message, cause) => { throw new TeamRepositoryError(code, message, cause); };

function storageFor(storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target || typeof target.getItem !== 'function' || typeof target.setItem !== 'function') {
      fail('STORAGE_UNAVAILABLE', 'Team localStorage is unavailable.');
    }
    return target;
  } catch (error) {
    if (error instanceof TeamRepositoryError) throw error;
    fail('STORAGE_UNAVAILABLE', 'Team localStorage is unavailable.', error);
  }
}

function membersFor(members, persisted = false) {
  if (!Array.isArray(members)) fail('INVALID_TEAM', 'Team members must be an array.');
  const memberIds = new Set();
  const personIds = new Set();
  return members.map(item => {
    let member;
    try {
      if (!item || typeof item !== 'object' || !nonempty(item.memberId)) fail('INVALID_TEAM', 'Persisted members need stable memberIds.');
      if (persisted || Object.hasOwn(item, 'labelSnapshot')) {
        if (!nonempty(item.personId)) fail('UNSAVED_MEMBER', 'Persisted members need a PeopleStore personId.');
        member = createMember({ memberId: item.memberId, personId: item.personId, displayName: item.labelSnapshot, origin: 'saved' });
      } else {
        member = createMember(item);
      }
    } catch (error) {
      if (error instanceof TeamRepositoryError) throw error;
      fail('INVALID_TEAM', 'Invalid team member.', error);
    }
    if (member.personId === null) fail('UNSAVED_MEMBER', 'Save each member to PeopleStore before saving the team.');
    if (memberIds.has(member.memberId)) fail('DUPLICATE_MEMBER_ID', 'Duplicate team memberId.');
    if (personIds.has(member.personId)) fail('DUPLICATE_PERSON_ID', 'A person may appear only once in a team.');
    memberIds.add(member.memberId);
    personIds.add(member.personId);
    return { memberId: member.memberId, personId: member.personId, labelSnapshot: member.displayName };
  });
}

function teamFor(team) {
  if (!team || typeof team !== 'object' || Array.isArray(team) || !nonempty(team.teamId) || !nonempty(team.name)) {
    fail('INVALID_TEAM', 'A team needs a teamId and name.');
  }
  if (team.schemaVersion !== TEAM_STORAGE_VERSION) fail('UNSUPPORTED_VERSION', 'Unsupported team schema version.');
  if (team.kind !== 'penta') fail('INVALID_TEAM', 'Team kind must be penta.');
  if (!Number.isSafeInteger(team.revision) || team.revision < 1) fail('INVALID_TEAM', 'Invalid team revision.');
  for (const key of ['createdAt', 'updatedAt']) {
    if (typeof team[key] !== 'string' || !Number.isFinite(Date.parse(team[key]))) fail('INVALID_TEAM', `Invalid ${key}.`);
  }
  return { schemaVersion: TEAM_STORAGE_VERSION, kind: 'penta', teamId: team.teamId, name: team.name.trim(), members: membersFor(team.members, true),
    revision: team.revision, createdAt: team.createdAt, updatedAt: team.updatedAt };
}

function readTeams(storage) {
  let raw;
  try { raw = storage.getItem(TEAM_STORAGE_KEY); }
  catch (error) { fail('STORAGE_READ_FAILED', 'Unable to read saved teams.', error); }
  if (raw === null) return [];
  let envelope;
  try { envelope = JSON.parse(raw); }
  catch (error) { fail('CORRUPT_STORAGE', 'Saved teams contain invalid JSON; original data was preserved.', error); }
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) fail('CORRUPT_STORAGE', 'Invalid team storage envelope.');
  if (envelope.version !== TEAM_STORAGE_VERSION) fail('UNSUPPORTED_VERSION', 'Unsupported team storage version; original data was preserved.');
  if (!Array.isArray(envelope.teams)) fail('CORRUPT_STORAGE', 'Invalid saved team list.');
  try {
    const ids = new Set();
    return envelope.teams.map(item => {
      const team = teamFor(item);
      if (ids.has(team.teamId)) fail('INVALID_TEAM', 'Duplicate saved teamId.');
      ids.add(team.teamId);
      return team;
    });
  } catch (error) {
    if (error.code === 'UNSUPPORTED_VERSION') throw error;
    fail('CORRUPT_STORAGE', 'Invalid saved team records; original data was preserved.', error);
  }
}

function writeTeams(storage, teams) {
  try { storage.setItem(TEAM_STORAGE_KEY, JSON.stringify({ version: TEAM_STORAGE_VERSION, teams })); }
  catch (error) { fail('STORAGE_WRITE_FAILED', 'Unable to save teams.', error); }
}

/** All operations are synchronous and throw TeamRepositoryError on failure.
 * Optional final storage argument supports isolated tests / storage adapters.
 * Empty storage returns []; a missing get returns null; a missing delete returns false.
 * No PeopleStore, chart cache or other localStorage key is read or written.
 */
export function listTeams(storage) {
  return readTeams(storageFor(storage));
}

export function getTeam(teamId, storage) {
  if (!nonempty(teamId)) fail('INVALID_TEAM_ID', 'teamId must be a nonempty string.');
  return listTeams(storage).find(team => team.teamId === teamId) ?? null;
}

/** Save {teamId?, name, members}; updates preserve creation time and increment revision.
 * If supplied on update, revision is an optimistic concurrency check.
 * Members may be runtime {memberId,personId,displayName,origin} or persisted
 * {memberId,personId,labelSnapshot}. Returns schemaVersion:1, kind:'penta' and
 * persisted members. Only relationship metadata is saved, never chart/birth payloads.
 */
export function saveTeam(input, storage) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !nonempty(input.name)) fail('INVALID_TEAM', 'A team needs a name and members.');
  if (input.schemaVersion !== undefined && input.schemaVersion !== TEAM_STORAGE_VERSION) fail('UNSUPPORTED_VERSION', 'Unsupported team schema version.');
  if (input.kind !== undefined && input.kind !== 'penta') fail('INVALID_TEAM', 'Team kind must be penta.');
  const members = membersFor(input.members);
  let teamId = input.teamId;
  if (teamId === undefined) {
    if (typeof globalThis.crypto?.randomUUID !== 'function') fail('ID_UNAVAILABLE', 'Secure UUID generation is unavailable.');
    teamId = globalThis.crypto.randomUUID();
  }
  if (!nonempty(teamId)) fail('INVALID_TEAM_ID', 'teamId must be a nonempty string.');
  const target = storageFor(storage);
  const teams = readTeams(target);
  const index = teams.findIndex(team => team.teamId === teamId);
  const previous = index < 0 ? null : teams[index];
  if (input.teamId === undefined && previous) fail('ID_COLLISION', 'Generated teamId already exists.');
  if (input.revision !== undefined && input.revision !== (previous?.revision ?? 0)) fail('REVISION_CONFLICT', 'Team revision changed; reload before saving.');
  const now = new Date().toISOString();
  const saved = teamFor({ schemaVersion: TEAM_STORAGE_VERSION, kind: 'penta', teamId, name: input.name, members, revision: (previous?.revision ?? 0) + 1,
    createdAt: previous?.createdAt ?? now, updatedAt: now });
  if (index < 0) teams.push(saved);
  else teams[index] = saved;
  writeTeams(target, teams);
  return saved;
}

export function deleteTeam(teamId, storage) {
  if (!nonempty(teamId)) fail('INVALID_TEAM_ID', 'teamId must be a nonempty string.');
  const target = storageFor(storage);
  const teams = readTeams(target);
  const remaining = teams.filter(team => team.teamId !== teamId);
  if (remaining.length === teams.length) return false;
  writeTeams(target, remaining);
  return true;
}
