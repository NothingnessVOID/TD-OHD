// An empty API configuration never enables accidental same-origin requests.
export function isSyncAvailable(apiBase, flag) {
  return flag !== 'false' && typeof apiBase === 'string' && apiBase.trim().length > 0;
}
