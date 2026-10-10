/**
 * Saved people — the single persistence seam (see docs/PLATFORM.md).
 *
 * The app talks to a PeopleStore; today there is one implementation,
 * LocalStore, preserving the existing browser library of saved birth data.
 *
 * When accounts ship, a SyncStore decorator wraps LocalStore here —
 * localStorage stays the live source of truth for the UI (instant,
 * offline-correct); the server becomes durable backup + cross-device
 * fan-out. Nothing outside this file changes.
 *
 * `VITE_OHD_API_BASE` unset (the default, and always the case for
 * self-hosted static builds) → pure local behavior, no network.
 */

import { getProfiles, getProfile, saveProfile, deleteProfile, PROFILE_STORAGE_KEY } from './profile-storage.js';
import { peopleChange, presentationIdentity } from './person-input.js';
import { localMode, localList, localGet, localSave, localDelete } from './local-store.js';

const LAST_KEY = 'ohd-last-person-id';

// ---------------------------------------------------------------------------
// LocalStore — birth profiles in localStorage
// ---------------------------------------------------------------------------
const LocalStore = {
  list: getProfiles,
  get: getProfile,
  delete: deleteProfile,
  save(birth) {
    return saveProfile({
      id: birth.id,
      name: birth.name || 'Unnamed',
      birthDate: birth.birthDate,
      birthTime: birth.birthTime,
      timeUnknown: !!birth.timeUnknown,
      location: birth.location ? {
        lat: birth.location.lat,
        lon: birth.location.lon,
        timezone: birth.timezone,
        iana: birth.location.iana || null,
        name: birth.location.name || null
      } : { lat: null, lon: null, timezone: birth.timezone, iana: null, name: null }
    });
  }
};

// SyncStore decorator: write-through to LocalStore (instant, offline-
// correct), with dirty-marking so the background sync pushes changes.
// Active only when a session exists (see enableSync below).
import { markDirty, markDeleted } from './sync.js';

let syncEnabled = false;
export function enableSync() { syncEnabled = true; }

const SyncStore = {
  list: LocalStore.list,
  get: LocalStore.get,
  save(birth) {
    const saved = LocalStore.save(birth);
    if (syncEnabled) markDirty(saved.id);
    return saved;
  },
  delete(id) {
    const result = LocalStore.delete(id);
    if (syncEnabled) markDeleted(id);
    return result;
  }
};

const store = localMode ? { list: localList, get: localGet, save: localSave, delete: localDelete } : SyncStore;

// ---------------------------------------------------------------------------
// Public API (stable — main.js and views depend on these names)
// ---------------------------------------------------------------------------
export const listPeople = (...args) => store.list(...args);
export const getPerson = (...args) => store.get(...args);
const peopleListeners = new Set();
let knownPeople = new Map();
let mutating = false;
function rememberPeople() { knownPeople = new Map(store.list().map(person => [person.id, person])); }
function emit(change) {
  for (const listener of peopleListeners) {
    try { listener(change); } catch (error) { console.error('People listener failed', error); }
  }
}
export function onPeopleChange(listener) {
  if (!peopleListeners.size) rememberPeople();
  peopleListeners.add(listener);
  return () => peopleListeners.delete(listener);
}
export function savePerson(...args) {
  const before = args[0]?.id ? store.get(args[0].id) : null;
  let saved;
  mutating = true;
  try { saved = store.save(...args); } finally { mutating = false; }
  rememberPeople();
  emit(peopleChange('save', before, saved));
  return saved;
}
export function deletePerson(id) {
  const before = store.get(id);
  let result;
  mutating = true;
  try { result = store.delete(id); } finally { mutating = false; }
  rememberPeople();
  if (before) emit(peopleChange('delete', before, null));
  return result;
}
function externalPeopleChanged() {
  if (mutating) return;
  const previous = knownPeople;
  rememberPeople();
  for (const id of new Set([...previous.keys(), ...knownPeople.keys()])) {
    const before = previous.get(id) || null, after = knownPeople.get(id) || null;
    if (presentationIdentity(before) !== presentationIdentity(after)) emit(peopleChange('external', before, after, id));
  }
}
if (typeof window !== 'undefined') {
  window.addEventListener('ohd-people-changed', externalPeopleChanged);
  window.addEventListener('storage', event => {
    if (!localMode && (event.key === PROFILE_STORAGE_KEY || event.key === null)) externalPeopleChanged();
  });
}

/** Profile (storage shape) → birth data (app shape). */
export function birthFromPerson(p) {
  return {
    id: p.id,
    name: p.name,
    birthDate: p.birthDate,
    birthTime: p.birthTime || '12:00',
    timeUnknown: !!p.timeUnknown,
    timezone: p.location?.timezone ?? 0,
    location: p.location && (p.location.lat != null || p.location.name || p.location.iana) ? {
      lat: p.location.lat,
      lon: p.location.lon,
      timezone: p.location.timezone,
      iana: p.location.iana || null,
      name: p.location.name || null
    } : null
  };
}

// --- AI access (per-person MCP visibility) --------------------------------
// Product metadata, deliberately NOT in the engine's profile schema —
// stored alongside and carried over sync (docs/PLATFORM.md §ai_access).
const AI_ACCESS_KEY = 'ohd-ai-access';

function readAiAccess() {
  try { return JSON.parse(localStorage.getItem(AI_ACCESS_KEY) || '{}'); } catch { return {}; }
}

export function getAiAccess(id) {
  return !!readAiAccess()[id];
}

export function setAiAccess(id, value) {
  try {
    const map = readAiAccess();
    if (value) map[id] = true;
    else delete map[id];
    localStorage.setItem(AI_ACCESS_KEY, JSON.stringify(map));
    if (syncEnabled) markDirty(id);
  } catch { /* private mode */ }
}

// Session-only: a chart someone arrived at through a share link. Kept in
// memory (not persisted) so that after they "make their own", the shared
// person is still available to compare against instead of vanishing.
let sharedGuest = null;
export function setSharedGuest(birth) { sharedGuest = birth; }
export function getSharedGuest() { return sharedGuest; }

export function getLastPersonId() {
  try { return localStorage.getItem(LAST_KEY); } catch { return null; }
}

export function setLastPersonId(id) {
  try {
    if (id) localStorage.setItem(LAST_KEY, id);
    else localStorage.removeItem(LAST_KEY);
  } catch { /* private mode */ }
}
