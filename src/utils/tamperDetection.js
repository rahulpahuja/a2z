// Best-effort, client-side-only heuristic.
// Trivially bypassed by anyone motivated to (undock devtools) and can
// false-positive for legitimate users (narrow windows, accessibility
// tooling). This is a weak deterrent, not a security boundary.
//
// There is no way for a webpage to detect a keylogger or any other
// OS-level/external process — that runs entirely outside the browser
// sandbox and is invisible to JavaScript. Do not extend this file to try;
// any such "detection" would be a false claim of protection.

const SIZE_THRESHOLD = 160;

export function isLikelyDevtoolsOpen() {
  if (typeof window === 'undefined') return false;
  const widthDiff = window.outerWidth - window.innerWidth;
  const heightDiff = window.outerHeight - window.innerHeight;
  return widthDiff > SIZE_THRESHOLD || heightDiff > SIZE_THRESHOLD;
}
