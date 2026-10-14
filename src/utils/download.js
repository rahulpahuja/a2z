// Shared browser-download helpers. Several admin pages used to inline their
// own "create object URL, click an anchor, revoke" snippet with inconsistent
// cleanup; use these instead.

const MAX_FILENAME_LENGTH = 150;
// How long the object URL stays alive after the click. Revoking synchronously
// can cancel the download in some browsers (Safari, older Firefox) because
// the navigation the click starts hasn't read the blob yet.
const REVOKE_DELAY_MS = 4000;

/**
 * Makes a string safe to use as a downloaded file's name: strips path
 * separators, characters reserved on Windows, and control characters,
 * collapses whitespace, drops leading dots (hidden files / "..") and trailing
 * dots/spaces, and caps the length while keeping the extension.
 */
export function sanitizeFilename(name, fallback = 'download') {
  let cleaned = String(name ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .replace(/[. ]+$/, '');

  if (cleaned.length > MAX_FILENAME_LENGTH) {
    const dot = cleaned.lastIndexOf('.');
    const ext = dot > 0 && cleaned.length - dot <= 10 ? cleaned.slice(dot) : '';
    cleaned = cleaned.slice(0, MAX_FILENAME_LENGTH - ext.length) + ext;
  }
  return cleaned || fallback;
}

/** Triggers a browser download of `blob` as `filename`. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeFilename(filename);
  link.rel = 'noopener';
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  }
}

const EXTENSION_BY_MIME = {
  'image/webp': '.webp',
  'image/png': '.png',
  'image/jpeg': '.jpg',
};

/**
 * Downloads a (possibly cross-origin) URL. A plain <a download> is silently
 * ignored by browsers for cross-origin URLs, so the file is fetched as a blob
 * first. If the fetch fails (e.g. no CORS on the bucket) the URL is opened in
 * a new tab instead so the user can still save it manually; `onFallback` is
 * called in that case so the caller can show a message.
 *
 * Resolves true if the download was triggered, false if it fell back.
 */
export async function downloadUrl(url, suggestedName, { onFallback } = {}) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
    const blob = await response.blob();
    const name = String(suggestedName ?? '');
    const extension = name.includes('.') ? '' : EXTENSION_BY_MIME[blob.type] || '';
    downloadBlob(blob, `${name}${extension}`);
    return true;
  } catch (err) {
    console.error('Download failed', err);
    onFallback?.(err);
    // Only ever hand http(s) URLs to window.open — never javascript:/data:.
    if (/^https?:\/\//i.test(String(url))) {
      window.open(url, '_blank', 'noopener');
    }
    return false;
  }
}
