// Best-effort, client-side-only heuristics — same caveat as botDetection.js.
// Both signals here are trivially bypassed by anyone motivated to (undock
// devtools, strip frame-busting) and can false-positive for legitimate users
// (narrow windows, accessibility tooling, legitimate embeds). This is a weak
// deterrent, not a security boundary.
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

export function isEmbeddedInIframe() {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    // A cross-origin frame throws on access to `top` — being blocked from
    // checking is itself a signal that another origin is framing this page.
    return true;
  }
}
