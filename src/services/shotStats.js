import { increment, onValue, ref, update } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';
import { isValidShotId } from '../utils/shotShare.js';

const ROOT = 'shotStats';
const LIKED_KEY = 'a2z_shot_likes';
const VIEWED_PREFIX = 'a2z_shot_viewed_';
const MAX_REMEMBERED_LIKES = 2000;

// ---- local persistence (per device) -----------------------------------------

function readLocalStats() {
  try {
    return JSON.parse(localStorage.getItem(ROOT) || '{}') || {};
  } catch {
    return {};
  }
}

const statListeners = new Set();
function writeLocalStats(stats) {
  try {
    localStorage.setItem(ROOT, JSON.stringify(stats));
  } catch {
    // Storage blocked: counts just won't persist in local mode.
  }
  statListeners.forEach((listener) => listener(stats));
}

export function readLikedShots() {
  try {
    const list = JSON.parse(localStorage.getItem(LIKED_KEY) || '[]');
    return new Set(Array.isArray(list) ? list.filter(isValidShotId) : []);
  } catch {
    return new Set();
  }
}

function writeLikedShots(set) {
  try {
    localStorage.setItem(LIKED_KEY, JSON.stringify([...set].slice(-MAX_REMEMBERED_LIKES)));
  } catch {
    // ignore
  }
}

// ---- stats ---------------------------------------------------------------------

const clean = (row) => ({
  views: Number.isFinite(row?.views) && row.views > 0 ? Math.floor(row.views) : 0,
  likes: Number.isFinite(row?.likes) && row.likes > 0 ? Math.floor(row.likes) : 0,
});

function normalizeAll(raw) {
  const out = {};
  Object.entries(raw && typeof raw === 'object' ? raw : {}).forEach(([id, row]) => {
    if (isValidShotId(id)) out[id] = clean(row);
  });
  return out;
}

// callback({ [shotId]: { views, likes } }). Firebase fires this immediately for our own
// writes (before the server confirms) and again if the server rejects them.
export function subscribeToShotStats(callback) {
  if (!isFirebaseEnabled) {
    statListeners.add(callback);
    callback(normalizeAll(readLocalStats()));
    return () => statListeners.delete(callback);
  }
  return onValue(
    ref(db, ROOT),
    (snapshot) => callback(normalizeAll(snapshot.val())),
    () => callback({})
  );
}

async function bump(shotId, field, delta) {
  if (!isValidShotId(shotId)) return;
  if (!isFirebaseEnabled) {
    const stats = readLocalStats();
    const row = clean(stats[shotId]);
    row[field] = Math.max(0, row[field] + delta);
    writeLocalStats({ ...stats, [shotId]: row });
    return;
  }
  await update(ref(db, `${ROOT}/${shotId}`), { [field]: increment(delta) });
}

// Counts a view at most once per browser session per shot. Returns whether it counted.
export async function recordShotView(shotId) {
  if (!isValidShotId(shotId)) return false;
  const key = `${VIEWED_PREFIX}${shotId}`;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
  } catch {
    // sessionStorage unavailable: fall through and count (better than never counting).
  }
  try {
    await bump(shotId, 'views', 1);
    return true;
  } catch {
    return false;
  }
}

// Likes and unlikes. The device remembers what it liked so the heart stays filled, and one
// device can add at most one like per shot. Resolves the new liked state.
export async function setShotLiked(shotId, liked) {
  if (!isValidShotId(shotId)) return false;
  const likedSet = readLikedShots();
  const already = likedSet.has(shotId);
  if (liked === already) return already;
  if (liked) likedSet.add(shotId);
  else likedSet.delete(shotId);
  writeLikedShots(likedSet);
  try {
    await bump(shotId, 'likes', liked ? 1 : -1);
    return liked;
  } catch (err) {
    // The server refused (e.g. offline rules rejection): put the device state back.
    const revert = readLikedShots();
    if (liked) revert.delete(shotId);
    else revert.add(shotId);
    writeLikedShots(revert);
    throw err;
  }
}
