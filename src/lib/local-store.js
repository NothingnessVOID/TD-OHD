// One password-protected library on this Mac. Browser storage is a retry queue,
// not the authoritative library. Each operation has its own durable key so tabs
// cannot overwrite one another's unsent edits.
import { t } from './i18n.js';

export const localMode = import.meta.env.VITE_OHD_LOCAL === 'true';
const CACHE = 'natalengine_profiles';
const OUTBOX = 'ohd-local-op-';
let cache = [];
let flight = null;
let timer;
let active = false;
export let localAccount = null;
let lastNotice = { state: 'saved', source: 'Saved on this Mac', params: {} };

const SERVER_ERROR_SOURCES = {
  '密码需为 8 至 128 个字符。': 'Password must be 8 to 128 characters long.',
  '不允许其他网站访问本机资料。': 'Other websites cannot access this local library.',
  '不允许跨站请求。': 'Cross-site requests are not allowed.',
  '请先输入本机密码。': 'Enter the local password first.',
  '请求格式需为 JSON。': 'The request must use JSON.',
  '一次传入的资料过多。': 'Too much data was sent at once.',
  '请求内容无效。': 'The request content is invalid.',
  '密码不正确，请重试。': 'Incorrect password. Please try again.',
  '已设置密码，请直接登录。': 'A password is already set. Please log in.',
  '密码刚刚被修改，请用新密码重试。': 'The password was just changed. Please try again with the new password.',
  '密码已在其他窗口修改，请重新登录。': 'The password was changed in another window. Please log in again.',
  '保存请求无效。': 'The save request is invalid.',
  '请求方式不支持。': 'This request method is not supported.',
  '本机服务暂时无法完成操作，请重试。': 'The local service could not complete the operation. Please try again.'
};

function cachedPeople() { try { return JSON.parse(localStorage.getItem(CACHE) || '[]'); } catch { return []; } }
function pendingOps() {
  return Object.keys(localStorage).filter(k => k.startsWith(OUTBOX)).map(k => JSON.parse(localStorage.getItem(k))).filter(Boolean)
    .sort((a,b) => a.queuedAt.localeCompare(b.queuedAt));
}
function noticeDetail() {
  const params = lastNotice.params.errorSource
    ? { ...lastNotice.params, error: t(lastNotice.params.errorSource) }
    : lastNotice.params;
  return { state: lastNotice.state, source: lastNotice.source, params, text: t(lastNotice.source, params) };
}
function announce(state, source, params = {}) {
  lastNotice = { state, source, params };
  window.dispatchEvent(new CustomEvent('ohd-save-status', { detail: noticeDetail() }));
}
export const getLocalSaveNotice = () => noticeDetail();
export async function localApi(path, options = {}) {
  let response;
  try {
    response = await fetch('/api/local/' + path, { credentials: 'same-origin', cache: 'no-store', ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers } });
  } catch {
    const source = 'Local service connection failed.';
    throw Object.assign(new Error(t(source)), { source });
  }
  let result;
  try { result = await response.json(); }
  catch {
    if (response.ok) {
      const source = 'The local service returned an invalid response.';
      throw Object.assign(new Error(t(source)), { source });
    }
    result = {};
  }
  if (!response.ok) {
    const source = SERVER_ERROR_SOURCES[result.error] || 'The local service could not complete the operation. Please try again.';
    const error = Object.assign(new Error(t(source)), { status: response.status, source });
    if (response.status === 401 && active) window.dispatchEvent(new Event('ohd-session-expired'));
    throw error;
  }
  return result;
}
function queue(kind, id, data) {
  const operationId = crypto.randomUUID();
  localStorage.setItem(OUTBOX + operationId, JSON.stringify({ operationId, kind, id, data, queuedAt: new Date().toISOString() }));
  announce('pending', 'Saving…');
  clearTimeout(timer); timer = setTimeout(() => flushLocal().catch(() => {}), 150);
}
function writeCache(people) {
  cache = people;
  localStorage.setItem(CACHE, JSON.stringify(people));
  window.dispatchEvent(new Event('ohd-people-changed'));
}
export const localList = () => cache;
export const localGet = id => cache.find(p => p.id === id) || null;
export function localSave(birth) {
  const name = birth.name?.trim() || `未命名 · ${birth.birthDate}`;
  const same = birth.id ? localGet(birth.id) : cache.find(p => p.name === name && p.birthDate === birth.birthDate && p.birthTime === birth.birthTime && p.location?.timezone === birth.timezone && !!p.timeUnknown === !!birth.timeUnknown);
  const person = { id: same?.id || birth.id || crypto.randomUUID(), name, birthDate: birth.birthDate,
    birthTime: birth.birthTime || '12:00', timeUnknown: !!birth.timeUnknown,
    location: { lat: birth.location?.lat ?? null, lon: birth.location?.lon ?? null, timezone: birth.timezone,
      iana: birth.location?.iana || null, name: birth.location?.name || null },
    createdAt: same?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  queue('save', person.id, person);
  writeCache([...cache.filter(p => p.id !== person.id), person]);
  return person;
}
export function localDelete(id) {
  queue('delete', id); writeCache(cache.filter(p => p.id !== id)); return true;
}
export function reportSaveFailure(error) {
  announce('error', 'Save incomplete: {error}', { errorSource: error.source || 'Local service connection failed.' });
}
export function flushLocal() {
  if (flight) return flight;
  const run = async () => {
    const ops = pendingOps();
    try {
      if (ops.length) announce('pending', 'Saving…');
      const result = await localApi('sync', { method:'POST', body:JSON.stringify({ operations: ops }) });
      for (const id of result.acknowledged) localStorage.removeItem(OUTBOX + id);
      // Edits made during the request stay in the queue and overlay the snapshot.
      const map = new Map(result.people.map(p => [p.id, p]));
      for (const op of pendingOps()) { if (op.kind === 'delete') map.delete(op.id); else map.set(op.id, op.data); }
      writeCache([...map.values()]);
      const remaining = pendingOps().length;
      announce(remaining ? 'pending' : result.backupWarning ? 'error' : 'saved',
        remaining ? 'Saving…' : result.backupWarning ? 'Data saved; automatic backup needs another try' : 'Saved on this Mac');
      if (remaining) { clearTimeout(timer); timer = setTimeout(() => flushLocal().catch(() => {}), 150); }
      return true;
    } catch (e) {
      announce('error', e.status === 401
        ? 'Session expired. Unsaved data remains in this browser.'
        : 'Could not reach the local service. Saving will retry automatically.');
      throw e;
    }
  };
  flight = (navigator.locks ? navigator.locks.request('ohd-local-sync', run) : run()).finally(() => { flight = null; });
  return flight;
}
export async function initializeLocal() {
  localAccount = await localApi('status');
  cache = cachedPeople();
  const migratedKey = 'ohd-local-migrated-' + localAccount.instance;
  if (!localStorage.getItem(migratedKey)) {
    // Original cached data remains untouched until the server acknowledges it.
    for (const person of cache) queue('import', person.id, { ...person, location: person.location || { timezone: 0 } });
    localStorage.setItem(migratedKey, '1');
  }
  await flushLocal();
  active = true;
  window.addEventListener('focus', () => flushLocal().catch(() => {}));
  window.addEventListener('online', () => flushLocal().catch(() => {}));
  window.addEventListener('storage', e => { if (e.key === CACHE) { cache = cachedPeople(); window.dispatchEvent(new Event('ohd-people-changed')); } });
  setInterval(() => { if (!document.hidden) flushLocal().catch(() => {}); }, 10000);
  window.addEventListener('beforeunload', e => { if (pendingOps().length) { e.preventDefault(); e.returnValue = ''; } });
}
export async function lockLocal() {
  await flushLocal();
  if (pendingOps().length) await flushLocal();
  if (pendingOps().length) {
    const source = 'Data is still saving. Please wait before locking.';
    throw Object.assign(new Error(t(source)), { source });
  }
  await localApi('logout', { method:'POST', body:'{}' });
  active = false;
  localStorage.removeItem(CACHE);
  localStorage.removeItem('ohd-last-person-id');
  location.replace('/');
}
