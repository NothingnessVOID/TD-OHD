// Preview-only adapter. All other browser preferences keep their normal storage.
import * as browser from '../src/lib/profile-storage.js';
export const PROFILE_STORAGE_KEY = browser.PROFILE_STORAGE_KEY;
const response = await fetch('/__preview/people');
if (!response.ok) throw new Error('预览人物库读取失败');
const shared = await response.json();
localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(shared));
let writes = Promise.resolve();
function persist(operation) {
  writes = writes.then(async () => {
    const result = await fetch('/__preview/people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(operation) });
    if (!result.ok) throw new Error('预览人物保存失败');
  });
  writes.catch(error => { console.error(error); window.dispatchEvent(new CustomEvent('preview-people-save-error', { detail: error.message })); });
}
export const getProfiles = browser.getProfiles;
export const getProfile = browser.getProfile;
export function saveProfile(profile) {
  const saved = browser.saveProfile(profile);
  persist({ kind: 'save', person: saved });
  return saved;
}
export function deleteProfile(id) {
  const removed = browser.deleteProfile(id);
  if (removed) persist({ kind: 'delete', id });
  return removed;
}
export const flushPreviewPeople = () => writes;
