// The local service decides whether a password is enforced; the UI only mirrors it.
// Pure functions so the decision can be tested without a browser.
export function shouldShowLocalGate(status) {
  if (!status || typeof status !== 'object') return true;
  if (status.passwordRequired === false) return false;
  return status.authenticated !== true;
}

export function passwordControlsVisible(status) {
  return status?.passwordRequired !== false;
}
