import { onValue, ref, runTransaction } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';
import { createDefaultHomeLayout, normalizeHomeLayout } from '../utils/homeLayout.js';

const PATH = 'settings/homeLayout';

// Thrown when someone else saved a newer layout since the editor loaded its copy.
export class HomeLayoutConflictError extends Error {
  constructor() {
    super('The home layout was changed by someone else. Load the latest version or overwrite it.');
    this.name = 'HomeLayoutConflictError';
    this.code = 'HOME_LAYOUT_CONFLICT';
  }
}

// The last layout seen is cached so the storefront paints the right order on the first
// frame instead of flashing the default one while Firebase connects.
export function getCachedHomeLayout() {
  try {
    const raw = localStorage.getItem(PATH);
    return raw ? normalizeHomeLayout(JSON.parse(raw)) : createDefaultHomeLayout();
  } catch {
    return createDefaultHomeLayout();
  }
}

function setCachedHomeLayout(layout) {
  try {
    localStorage.setItem(PATH, JSON.stringify(layout));
  } catch {
    // Ignore storage errors (private mode, quota).
  }
}

const listeners = new Set();
function notifyListeners() {
  const layout = getCachedHomeLayout();
  listeners.forEach((listener) => listener(layout, null, { cached: false }));
}

// callback(layout, error, { cached }): `cached` is true for the instant first paint from
// localStorage, whose revision may be stale; only a `cached: false` value is authoritative.
export function subscribeToHomeLayout(callback) {
  const cached = getCachedHomeLayout();
  callback(cached, null, { cached: isFirebaseEnabled });

  if (!isFirebaseEnabled) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }

  return onValue(
    ref(db, PATH),
    (snapshot) => {
      const layout = normalizeHomeLayout(snapshot.exists() ? snapshot.val() : null);
      setCachedHomeLayout(layout);
      callback(layout, null, { cached: false });
    },
    // Keep serving the cached layout if the read fails.
    (error) => callback(cached, error, { cached: true })
  );
}

// Saves `layout` if the stored copy is still at `expectedRev`; otherwise rejects with
// HomeLayoutConflictError. The new revision is stored with the layout. Only super users
// can write (database rules: settings/* requires auth.token.admin).
export async function saveHomeLayout(layout, expectedRev) {
  const normalized = normalizeHomeLayout(layout);
  const build = (currentRev) => ({
    ...normalized,
    rev: currentRev + 1,
    updatedAt: Date.now(),
  });

  if (!isFirebaseEnabled) {
    const current = getCachedHomeLayout();
    if (current.rev !== expectedRev) throw new HomeLayoutConflictError();
    const next = build(current.rev);
    setCachedHomeLayout(next);
    notifyListeners();
    return next;
  }

  let saved = null;
  const result = await runTransaction(ref(db, PATH), (current) => {
    // The first pass can run against an empty local cache even when the server holds a
    // value; returning a write here is safe because the server re-runs this with the real
    // value if it differs.
    if (current === null) {
      saved = build(expectedRev);
      return saved;
    }
    const currentRev = normalizeHomeLayout(current).rev;
    if (currentRev !== expectedRev) return undefined; // abort -> conflict
    saved = build(currentRev);
    return saved;
  });

  if (!result.committed) throw new HomeLayoutConflictError();
  const committed = normalizeHomeLayout(result.snapshot.val());
  setCachedHomeLayout(committed);
  return committed;
}

export function resetHomeLayout(expectedRev) {
  return saveHomeLayout(createDefaultHomeLayout(), expectedRev);
}
