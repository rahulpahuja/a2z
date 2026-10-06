import { onValue, ref, remove, set } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';
import { createLocalStore } from './localStore.js';

// Stored under its own node rather than on the product, because saving a
// product replaces the whole product record and would otherwise wipe its FAQs.
const ROOT = 'productFaqs';
const localStore = createLocalStore(ROOT);

export const MAX_FAQS_PER_PRODUCT = 30;
const MAX_QUESTION = 200;
const MAX_ANSWER = 1000;

// Trims entries and drops any with a blank question or answer, so the stored
// list never contains half-filled rows the storefront would render as empty.
export function sanitizeFaqs(faqs) {
  return (faqs ?? [])
    .map((faq) => ({
      question: (faq.question ?? '').trim().slice(0, MAX_QUESTION),
      answer: (faq.answer ?? '').trim().slice(0, MAX_ANSWER),
    }))
    .filter((faq) => faq.question && faq.answer)
    .slice(0, MAX_FAQS_PER_PRODUCT);
}

export function subscribeToProductFaqs(productId, callback) {
  if (!isFirebaseEnabled) {
    return localStore.subscribe(productId, (value) => callback(value ?? [], null));
  }
  return onValue(
    ref(db, `${ROOT}/${productId}`),
    (snapshot) => {
      const value = snapshot.val();
      callback(Array.isArray(value) ? value : Object.values(value ?? {}), null);
    },
    (error) => callback([], error)
  );
}

// Admin-only: the database rules restrict writes on this node to authenticated users.
export function saveProductFaqs(productId, faqs) {
  const cleaned = sanitizeFaqs(faqs);
  if (!isFirebaseEnabled) {
    localStore.write(productId, cleaned.length > 0 ? cleaned : null);
    return Promise.resolve();
  }
  const faqRef = ref(db, `${ROOT}/${productId}`);
  return cleaned.length > 0 ? set(faqRef, cleaned) : remove(faqRef);
}
