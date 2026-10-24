import { get, onValue, ref, runTransaction, update } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';
import { createLocalStore } from './localStore.js';

// A tiny storage layer under services/blog.js so all blog logic runs identically against Firebase and
// against the localStorage fallback used when Firebase isn't configured (local development).
// Paths are 'blogs/...'; update() applies a multi-path write atomically (null deletes).

const local = createLocalStore('a2z_blog_tree');
const TREE_KEY = 'tree';
const localListeners = new Map(); // path -> Set<callback>

const readTree = () => local.read(TREE_KEY) ?? {};

function getAt(tree, path) {
  return path.split('/').filter(Boolean).reduce((node, key) => (node && typeof node === 'object' ? node[key] : undefined), tree) ?? null;
}

function setAt(tree, path, value) {
  const keys = path.split('/').filter(Boolean);
  const isDelete = value === null || value === undefined;
  const trail = [tree];
  let node = tree;
  for (const key of keys.slice(0, -1)) {
    if (!node[key] || typeof node[key] !== 'object') {
      if (isDelete) return; // nothing there to delete
      node[key] = {};
    }
    node = node[key];
    trail.push(node);
  }
  const last = keys[keys.length - 1];
  if (isDelete) delete node[last];
  else node[last] = JSON.parse(JSON.stringify(value));
  // Like Realtime Database, a node with no children stops existing.
  for (let i = keys.length - 1; i > 0 && isDelete; i -= 1) {
    if (Object.keys(trail[i]).length > 0) break;
    delete trail[i - 1][keys[i - 1]];
  }
}

function notifyLocal() {
  const tree = readTree();
  localListeners.forEach((callbacks, path) => callbacks.forEach((cb) => cb(getAt(tree, path))));
}

export const isBlogBackendFirebase = () => isFirebaseEnabled;

export async function readOnce(path) {
  if (!isFirebaseEnabled) return getAt(readTree(), path);
  const snapshot = await get(ref(db, path));
  return snapshot.exists() ? snapshot.val() : null;
}

export function subscribe(path, callback, onError) {
  if (!isFirebaseEnabled) {
    if (!localListeners.has(path)) localListeners.set(path, new Set());
    localListeners.get(path).add(callback);
    callback(getAt(readTree(), path));
    return () => localListeners.get(path)?.delete(callback);
  }
  return onValue(
    ref(db, path),
    (snapshot) => callback(snapshot.exists() ? snapshot.val() : null),
    (error) => onError?.(error)
  );
}

// Atomic multi-path write: { 'blogs/public/x': {...}, 'blogs/slugs/y': null, ... }.
export async function applyWrites(writes) {
  if (!isFirebaseEnabled) {
    const tree = readTree();
    Object.entries(writes).forEach(([path, value]) => setAt(tree, path, value));
    local.write(TREE_KEY, tree);
    notifyLocal();
    return;
  }
  // JSON round trip drops `undefined`, which Realtime Database rejects.
  await update(ref(db), JSON.parse(JSON.stringify(writes, (_k, v) => (v === undefined ? null : v))));
}

// Claims `slug` for `ownerId`. Resolves true when it is now (or already was) ours, false when another
// post owns it. Uses a transaction so two admins cannot claim the same slug at once.
export async function claimSlug(slug, ownerId) {
  const path = `blogs/slugClaims/${slug}`;
  if (!isFirebaseEnabled) {
    const tree = readTree();
    const owner = getAt(tree, path);
    if (owner && owner !== ownerId) return false;
    setAt(tree, path, ownerId);
    local.write(TREE_KEY, tree);
    return true;
  }
  const result = await runTransaction(ref(db, path), (current) => (current === null || current === ownerId ? ownerId : undefined));
  return Boolean(result.committed);
}
