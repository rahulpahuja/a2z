// Shared input-security helpers for anything that takes free text from a user
// before it's stored (Firebase) or sent to a payment API (Razorpay worker).
//
// This app has no SQL database — there is no SQL injection surface here.
// What these helpers actually guard against is unsanitized text ending up in
// Firebase or being reflected back into the page (script/HTML injection),
// plus basic shape/range validation so obviously-invalid input never reaches
// a paid API call.

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIAN_PHONE_RE = /^[6-9]\d{9}$/;
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i;

/**
 * Strip HTML tags and control characters from free text, collapse
 * whitespace, and cap length. Safe to run on any single-line text input
 * (name, address line, receipt id, etc.) before storing it.
 */
export function sanitizeText(value, { maxLength = 200 } = {}) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<\/?[^>]*>/g, '')
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Escape text for safe interpolation into HTML. */
export function escapeHtml(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

export function isValidEmail(value) {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value.trim());
}

export function isValidIndianPhone(value) {
  return typeof value === 'string' && INDIAN_PHONE_RE.test(value.trim());
}

export function isValidGstNumber(value) {
  return typeof value === 'string' && GST_RE.test(value.trim());
}

/** Finite number within [min, max] — guards amounts before they reach a payment API. */
export function isValidAmount(value, { min = 1, max = 1_000_000 } = {}) {
  const num = Number(value);
  return Number.isFinite(num) && num >= min && num <= max;
}

/**
 * Sanitize the free-text fields of the checkout shipping form. Select-driven
 * fields (state, city, referredBy) and the phone field (already digit-only
 * filtered in CheckoutShippingPage) are passed through untouched.
 */
export function sanitizeShippingForm(form) {
  return {
    ...form,
    firstName: sanitizeText(form.firstName, { maxLength: 60 }),
    lastName: sanitizeText(form.lastName, { maxLength: 60 }),
    address: sanitizeText(form.address, { maxLength: 200 }),
    apartment: sanitizeText(form.apartment, { maxLength: 100 }),
    zip: sanitizeText(form.zip, { maxLength: 12 }),
    gstNumber: sanitizeText(form.gstNumber, { maxLength: 15 }).toUpperCase(),
  };
}
