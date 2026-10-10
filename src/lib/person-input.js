/** Calculation identity excludes presentation and relationship metadata. */
export const effectiveBirthTime = birth => birth.timeUnknown ? '12:00' : birth.birthTime;
export function calculationIdentity(birth) {
  if (!birth) return null;
  return JSON.stringify([birth.birthDate, effectiveBirthTime(birth), birth.timezone ?? birth.location?.timezone, !!birth.timeUnknown]);
}
export function presentationIdentity(profile) {
  if (!profile) return null;
  return JSON.stringify([profile.id, profile.name, profile.birthDate, profile.birthTime, !!profile.timeUnknown, profile.timezone ?? profile.location?.timezone, profile.location]);
}
export function peopleChange(type, before, after, personId = after?.id ?? before?.id ?? null) {
  return { type, personId, before, after, calculationChanged: calculationIdentity(before) !== calculationIdentity(after), presentationChanged: presentationIdentity(before) !== presentationIdentity(after) };
}
export function randomPersonId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
