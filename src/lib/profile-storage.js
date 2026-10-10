/** Browser birth-data storage. Legacy key retained so saved people survive migration. */
export const PROFILE_STORAGE_KEY = ['natal', 'engine', '_profiles'].join('');
const MAX_PROFILES = 50;

export function getProfiles() {
  try {
    const profiles = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || '[]');
    return profiles.map(({ cachedData, ...profile }) => profile);
  } catch { return []; }
}

export function getProfile(id) {
  return getProfiles().find(profile => profile.id === id) || null;
}

function generateId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.random() * 16 | 0;
    return (character === 'x' ? random : (random & 0x3 | 0x8)).toString(16);
  });
}

export function saveProfile(profile) {
  const profiles = getProfiles();
  const now = new Date().toISOString();
  const previous = profile.id ? profiles.find(item => item.id === profile.id) : null;
  const clean = {
    id: profile.id || generateId(),
    name: profile.name || 'Unnamed Profile',
    birthDate: profile.birthDate,
    birthTime: profile.birthTime || '12:00',
    timeUnknown: !!profile.timeUnknown,
    location: profile.location ? {
      lat: profile.location.lat, lon: profile.location.lon,
      timezone: profile.location.timezone,
      iana: profile.location.iana || null,
      name: profile.location.name || null
    } : null,
    createdAt: previous?.createdAt || profile.createdAt || now,
    updatedAt: now
  };
  const index = profile.id ? profiles.findIndex(item => item.id === profile.id) : -1;
  if (index >= 0) profiles[index] = clean;
  else {
    if (profiles.length >= MAX_PROFILES) throw new Error(`Maximum of ${MAX_PROFILES} profiles allowed. Please delete some profiles first.`);
    profiles.push(clean);
  }
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
  return clean;
}

export function deleteProfile(id) {
  const profiles = getProfiles();
  const index = profiles.findIndex(profile => profile.id === id);
  if (index < 0) return false;
  profiles.splice(index, 1);
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
  return true;
}
