// Works out what to report when a visitor clicks an option (a link, button, tab or toggle) anywhere on the
// storefront, so every option is counted without each component logging for itself.
//
// Privacy: no clicks are reported from the admin, or from the pages that show a customer's personal details
// (checkout, profile, orders). A label that looks like a phone number, email address or long id is replaced, mailto:
// and tel: links report only their scheme, and an element (or a whole area) can opt out with data-analytics-ignore.

export const MAX_LABEL_LENGTH = 60;
export const REDACTED = '(redacted)';

// Pages where a click is never reported.
const SKIPPED_PATHS = /^\/(super|dashboard|checkout|profile|orders)(\/|$)/;
const CLICKABLE = 'a[href], button, [role="button"], [role="tab"], [role="menuitem"], summary';
const LANDMARKS = [
  ['header', 'header'],
  ['footer', 'footer'],
  ['[role="dialog"], aside', 'menu'],
  ['nav', 'nav'],
  ['main', 'main'],
];

export function cleanLabel(raw) {
  const label = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!label) return '';
  if (/\d{6,}|@/.test(label)) return REDACTED;
  return label.length > MAX_LABEL_LENGTH ? `${label.slice(0, MAX_LABEL_LENGTH - 1)}…` : label;
}

// What the visitor sees on the option, without the icon names (material icons are text such as "arrow_back").
function visibleText(element) {
  const copy = element.cloneNode(true);
  copy.querySelectorAll('.material-symbols-outlined, [aria-hidden="true"], svg, script, style').forEach((node) => node.remove());
  return copy.textContent;
}

function destinationOf(anchor, origin) {
  let url;
  try {
    url = new URL(anchor.getAttribute('href'), origin);
  } catch {
    return undefined;
  }
  if (url.protocol === 'mailto:' || url.protocol === 'tel:') return url.protocol.slice(0, -1);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
  if (url.origin !== origin) return url.hostname;
  return `${url.pathname}${url.search}`.slice(0, 100);
}

// The event parameters for a click on `target`, or null when it should not be reported.
export function describeClick(target, { pathname, origin }) {
  if (!target?.closest || SKIPPED_PATHS.test(pathname)) return null;
  const element = target.closest(CLICKABLE);
  if (!element || element.closest('[data-analytics-ignore]')) return null;

  const isLink = element.tagName === 'A';
  const label = cleanLabel(element.getAttribute('data-analytics-label') || element.getAttribute('aria-label') || visibleText(element) || element.getAttribute('title')) || 'unlabelled';
  const area = LANDMARKS.find(([selector]) => element.closest(selector))?.[1] ?? 'page';
  const params = { element: isLink ? 'link' : 'button', label, area, page_path: pathname };
  const destination = isLink ? destinationOf(element, origin) : undefined;
  if (destination) params.destination = destination;
  return params;
}
