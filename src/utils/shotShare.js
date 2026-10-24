// Shots are addressed by `${productId}_${videoIndex}` and shared as /shots?v=<shotId>.

const SHOT_ID = /^[\w-]{1,160}$/;

export const isValidShotId = (id) => typeof id === 'string' && SHOT_ID.test(id);

export function buildShotUrl(shotId, origin) {
  return `${String(origin).replace(/\/$/, '')}/shots?v=${encodeURIComponent(shotId)}`;
}

// The shot id in a query string, or null when it is missing or not a plausible id.
export function parseShotParam(search) {
  const value = new URLSearchParams(search).get('v');
  return isValidShotId(value) ? value : null;
}

// Which product a shot belongs to: everything before the trailing `_<index>`.
export function shotProductId(shotId) {
  const match = /^(.+)_(\d+)$/.exec(String(shotId ?? ''));
  return match ? match[1] : null;
}

// Native share sheet where there is one, otherwise the clipboard.
// Resolves 'shared' | 'copied' | 'cancelled' | 'failed'.
export async function shareLink({ title, text, url }, nav = typeof navigator === 'undefined' ? undefined : navigator) {
  if (nav?.share) {
    try {
      await nav.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
      // Some browsers refuse share() outside a gesture; fall through to copying.
    }
  }
  try {
    await nav?.clipboard?.writeText(url);
    return nav?.clipboard ? 'copied' : 'failed';
  } catch {
    return 'failed';
  }
}
