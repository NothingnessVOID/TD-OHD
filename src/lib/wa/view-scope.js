/** The legacy Core Wa metadata covers the whole organization; only show estimates in this view. */
export function hasScopedWaEstimate(result) {
  return ['ready','empty'].includes(result?.status) && Boolean(result.coreWa?.uncertainty?.estimatedMemberIds
    ?.some(id => result.memberIds.includes(id)));
}

/** Presentation-only scope selection. The model owns admission and chart calculations. */
export function resolveWaViewScope(snapshot, { pentaId = null, includeAlpha = false } = {}) {
  const group = pentaId === null ? null : snapshot.pentas.find(group => group.pentaId === pentaId);
  if (pentaId !== null && !group) throw new RangeError('Unknown Wa view group.');
  const withAlpha = pentaId === null || (includeAlpha === true && snapshot.alphaId !== null);
  const memberIds = [...new Set([
    ...(group ? group.memberIds : snapshot.pentas.flatMap(group => group.memberIds)),
    ...(withAlpha && snapshot.alphaId !== null ? [snapshot.alphaId] : [])
  ])].sort();
  return { pentaId, includeAlpha: withAlpha, memberIds, memberCount: memberIds.length,
    kind: group ? withAlpha ? 'group_with_alpha' : 'group_only' : 'organization' };
}
