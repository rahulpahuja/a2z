export const MAX_FOOTER_TEXT_LENGTH = 500;

// Control characters (except tab/newline, handled separately), zero-width
// characters and bidi overrides. None are legitimate in a footer note, and the
// bidi overrides can visually reverse surrounding text.
// oxlint-disable-next-line no-control-regex -- the control characters are the point
const INVISIBLE_CHARS = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\uFEFF]', 'g');

// Footer notes are plain text: the storefront renders them as a React text
// node (never HTML), so markup typed by the super user shows up literally. This
// normalizes whatever is stored — also applied when rendering, because the
// database can be edited outside the admin page.
export function sanitizeFooterText(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(INVISIBLE_CHARS, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_FOOTER_TEXT_LENGTH)
    .trim();
}

// Paths that are not customer-facing; the site-wide note never shows there.
export function isFooterNotePath(pathname) {
  const path = String(pathname || '');
  return !(path === '/super' || path.startsWith('/super/') || path === '/dashboard' || path.startsWith('/dashboard/'));
}
