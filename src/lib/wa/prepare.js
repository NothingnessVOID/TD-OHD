import { validateWaLayout } from './model.js';
import { validateBirth } from '../human-design/team-members.js';
import { extractTeamActivations, TEAM_PLANETS } from '../human-design/team-activation.js';

const problem = (code, memberId, message) => ({ code, memberId, message });
const plainRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

// Runtime charts can contain optional undefined values and shared/cyclic metadata.
// Only the finite activation paths consumed by the full Sharp contract need plain records.
function validateChart(chart) {
  if (!plainRecord(chart) || !plainRecord(chart.gates)) return false;
  return ['personality', 'design'].every(side => plainRecord(chart.gates[side])
    && TEAM_PLANETS.every(planet => plainRecord(chart.gates[side][planet])));
}

/** Runtime only. getPerson receives a PeopleStore personId; calculateBirth returns {chart}.
 * Supports (snapshot, {getPerson, calculateBirth}) and (snapshot, getPerson, calculateBirth).
 * All refs and participant births are checked before any provider call. Pool is excluded.
 * UI still owns generation/person-change cancellation. No prepared data is persisted.
 */
export async function prepareWaMembers(snapshot, lookup = {}, calculate) {
  const getPerson = typeof lookup === 'function' ? lookup : lookup?.getPerson;
  const calculateBirth = calculate ?? lookup?.calculateBirth;
  // UI can inject effectiveTeamBirth. The default preserves that exact explicit-unknown contract.
  const effectiveBirth = lookup?.effectiveBirth ?? (birth => ({ ...birth, birthTime: birth.timeUnknown === true ? '12:00' : birth.birthTime }));
  const layoutValidation = validateWaLayout(snapshot);
  const result = (status, members = [], issues = []) => ({ status, members, issues, layoutValidation });
  if (!layoutValidation.ready) return result('layout_not_ready', [], layoutValidation.issues);
  if (typeof getPerson !== 'function' || typeof calculateBirth !== 'function') {
    return result('not_ready', [], [problem('PREPARE_DEPENDENCY_REQUIRED', null, 'Pass getPerson and calculateBirth functions.')]);
  }
  // Capture refs before asynchronous lookup so caller edits cannot retarget a running request.
  const captured = structuredClone(snapshot);
  const candidates = [], issues = [];
  for (const id of layoutValidation.memberIds) {
    const member = captured.members.find(item => item.memberId === id);
    let person;
    try { person = await getPerson(member.personId); }
    catch { issues.push(problem('PERSON_LOOKUP_FAILED', id, 'Could not resolve the saved person.')); continue; }
    if (!plainRecord(person) || person.id !== member.personId) {
      issues.push(problem('MISSING_PERSON_REFERENCE', id, 'The saved person reference is missing or mismatched.')); continue;
    }
    // Legacy PeopleStore records omitted the flag for known times.
    const timeUnknown = Object.hasOwn(person, 'timeUnknown') ? person.timeUnknown : false;
    if (typeof timeUnknown !== 'boolean') {
      issues.push(problem('INVALID_TIME_UNKNOWN', id, 'timeUnknown must be a boolean.')); continue;
    }
    const timezone = person.timezone ?? person.location?.timezone;
    const suppliedTime = person.birthTime;
    if (suppliedTime != null && suppliedTime !== '' && (typeof suppliedTime !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(suppliedTime))) {
      issues.push(problem('INVALID_BIRTH', id, 'Birth time must use HH:MM.')); continue;
    }
    // The sole estimate is the existing explicit-unknown noon contract.
    const rawBirth = { id: person.id, name: person.name ?? member.labelSnapshot,
      birthDate: person.birthDate, birthTime: suppliedTime, timeUnknown, timezone,
      ...(person.location ? { location: person.location } : {}) };
    if (!validateBirth({ ...rawBirth, birthTime: timeUnknown ? '12:00' : suppliedTime })) {
      issues.push(problem('INVALID_BIRTH', id, 'An actual date, explicit time or unknown flag, and numeric UTC offset are required.')); continue;
    }
    let birth;
    try {
      birth = effectiveBirth(structuredClone(rawBirth));
      if (!validateBirth(birth) || birth.birthDate !== rawBirth.birthDate || birth.timezone !== timezone
        || birth.timeUnknown !== timeUnknown || birth.birthTime !== (timeUnknown ? '12:00' : suppliedTime)) throw new Error('Invalid birth adapter');
    } catch {
      issues.push(problem('INVALID_BIRTH', id, 'Birth adapter must preserve validated inputs and explicit unknown-time semantics.')); continue;
    }
    candidates.push({ memberId: id, personId: member.personId, displayName: person.name ?? member.labelSnapshot,
      timeUnknown, birthTimeConfidence: timeUnknown ? 'estimated' : 'exact', birth });
  }
  if (issues.length) return result('not_ready', [], issues);
  const members = [];
  for (const candidate of candidates) {
    let output;
    try { output = await calculateBirth(structuredClone(candidate.birth)); }
    catch {
      issues.push(problem('CHART_CALCULATION_FAILED', candidate.memberId, 'Chart calculation failed.')); continue;
    }
    try {
      if (!output || !validateChart(output.chart)) throw new Error('Invalid chart');
      extractTeamActivations({ memberId: candidate.memberId, chart: output.chart });
      members.push({ ...candidate, chart: structuredClone(output.chart) });
    } catch {
      issues.push(problem('INVALID_PROVIDER_RESULT', candidate.memberId, 'Provider must return a complete Sharp chart.'));
    }
  }
  return issues.length ? result('not_ready', [], issues) : result('ready', members);
}
