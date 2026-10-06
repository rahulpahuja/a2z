import { onValue, push, ref, remove, runTransaction, serverTimestamp } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';
import { createLocalStore } from './localStore.js';

const ROOT = 'productReviews';
const HELPFUL_VOTES_KEY = 'helpfulReviewVotes';
const localStore = createLocalStore(ROOT);

// These limits are mirrored in database.rules.json; keep them in sync.
export const REVIEW_LIMITS = { name: 60, title: 100, bodyMin: 10, bodyMax: 2000 };

// Validates and normalises a review before it is written. Throws a
// user-facing Error so the form can show the message directly.
export function sanitizeReview({ name, rating, title, body }) {
  const cleaned = {
    name: (name ?? '').trim(),
    rating: Number(rating),
    title: (title ?? '').trim(),
    body: (body ?? '').trim(),
  };
  if (!cleaned.name || cleaned.name.length > REVIEW_LIMITS.name) {
    throw new Error(`Please enter your name (up to ${REVIEW_LIMITS.name} characters).`);
  }
  if (!Number.isInteger(cleaned.rating) || cleaned.rating < 1 || cleaned.rating > 5) {
    throw new Error('Please choose a star rating.');
  }
  if (cleaned.title.length > REVIEW_LIMITS.title) {
    throw new Error(`The review title can be up to ${REVIEW_LIMITS.title} characters.`);
  }
  if (cleaned.body.length < REVIEW_LIMITS.bodyMin || cleaned.body.length > REVIEW_LIMITS.bodyMax) {
    throw new Error(`Please write between ${REVIEW_LIMITS.bodyMin} and ${REVIEW_LIMITS.bodyMax} characters.`);
  }
  return cleaned;
}

const newestFirst = (rows) => rows.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));

// Local mode stores reviews as an array per product; Firebase stores a keyed map.
const toRows = (value) => {
  if (!value) return [];
  const entries = Array.isArray(value) ? value.map((row, i) => [row?.id ?? String(i), row]) : Object.entries(value);
  return entries.map(([id, row]) => ({ id, ...row }));
};

export function subscribeToProductReviews(productId, callback) {
  if (!isFirebaseEnabled) {
    return localStore.subscribe(productId, (value) => callback(newestFirst(toRows(value)), null));
  }
  return onValue(
    ref(db, `${ROOT}/${productId}`),
    (snapshot) => callback(newestFirst(toRows(snapshot.val())), null),
    (error) => callback([], error)
  );
}

export function createProductReview(productId, input) {
  const review = sanitizeReview(input);
  const createdAtMs = Date.now();
  if (!isFirebaseEnabled) {
    const id = `review_${createdAtMs}_${Math.random().toString(36).slice(2, 7)}`;
    const existing = localStore.read(productId) ?? [];
    localStore.write(productId, [...existing, { id, ...review, helpful: 0, createdAtMs }]);
    return Promise.resolve(id);
  }
  return push(ref(db, `${ROOT}/${productId}`), {
    ...review,
    helpful: 0,
    createdAt: serverTimestamp(),
    createdAtMs,
  });
}

// Each browser may vote once per review. The vote is remembered locally so the
// button stays disabled after a reload; the database itself only lets the
// counter rise by exactly one per write.
function readHelpfulVotes() {
  try {
    return JSON.parse(localStorage.getItem(HELPFUL_VOTES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function hasVotedHelpful(productId, reviewId) {
  return readHelpfulVotes().includes(`${productId}/${reviewId}`);
}

function rememberHelpfulVote(key) {
  try {
    localStorage.setItem(HELPFUL_VOTES_KEY, JSON.stringify([...readHelpfulVotes(), key]));
  } catch {
    // Storage can be unavailable (private mode); the vote still counted.
  }
}

export function markReviewHelpful(productId, reviewId) {
  const key = `${productId}/${reviewId}`;
  if (hasVotedHelpful(productId, reviewId)) return Promise.resolve(false);

  if (!isFirebaseEnabled) {
    const existing = localStore.read(productId) ?? [];
    const target = existing.find((row) => row.id === reviewId);
    if (!target) return Promise.resolve(false);
    localStore.write(
      productId,
      existing.map((row) => (row.id === reviewId ? { ...row, helpful: (row.helpful ?? 0) + 1 } : row))
    );
    rememberHelpfulVote(key);
    return Promise.resolve(true);
  }

  return runTransaction(ref(db, `${ROOT}/${productId}/${reviewId}/helpful`), (count) =>
    count === null ? undefined : count + 1
  ).then((result) => {
    if (result.committed) rememberHelpfulVote(key);
    return result.committed;
  });
}

// Admin-only: the database rules restrict deletes on this node to authenticated users.
export function deleteProductReview(productId, reviewId) {
  if (!isFirebaseEnabled) {
    const remaining = (localStore.read(productId) ?? []).filter((row) => row.id !== reviewId);
    localStore.write(productId, remaining.length > 0 ? remaining : null);
    return Promise.resolve();
  }
  return remove(ref(db, `${ROOT}/${productId}/${reviewId}`));
}
