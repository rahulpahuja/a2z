import { onValue, ref, set } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const PATH = 'settings/topNav';

export const DEFAULT_TOP_NAV_LINKS = [
  { id: 'nav_new_arrivals', label: 'New Arrivals', type: 'all' },
  { id: 'nav_saree', label: 'Sarees', type: 'category', category: 'Saree' },
  { id: 'nav_lehenga', label: 'Lehengas', type: 'category', category: 'Lehenga' },
  { id: 'nav_kurti', label: 'Kurtis', type: 'category', category: 'Kurti' },
];

function getLocalTopNav() {
  try {
    const data = localStorage.getItem(PATH);
    return data ? JSON.parse(data) : DEFAULT_TOP_NAV_LINKS;
  } catch {
    return DEFAULT_TOP_NAV_LINKS;
  }
}

function setLocalTopNav(links) {
  localStorage.setItem(PATH, JSON.stringify(links));
}

const listeners = new Set();
function notifyListeners() {
  const data = getLocalTopNav();
  listeners.forEach((listener) => listener(data, null));
}

export function subscribeToTopNav(callback) {
  if (!isFirebaseEnabled) {
    listeners.add(callback);
    callback(getLocalTopNav(), null);
    return () => {
      listeners.delete(callback);
    };
  }
  return onValue(
    ref(db, PATH),
    (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : DEFAULT_TOP_NAV_LINKS, null);
    },
    (error) => callback(DEFAULT_TOP_NAV_LINKS, error)
  );
}

export function saveTopNav(links) {
  if (!isFirebaseEnabled) {
    setLocalTopNav(links);
    notifyListeners();
    return Promise.resolve();
  }
  return set(ref(db, PATH), links);
}

// A nav link only ever references one or more categories by name (never a
// free-form URL), so this can only ever resolve to an in-catalog products
// view. `categories` (array) is preferred; `category` (single string) is
// kept for links saved before multi-category support was added.
export function topNavLinkToPath(link) {
  if (link.type === 'category') {
    const categories = link.categories?.length ? link.categories : (link.category ? [link.category] : []);
    if (categories.length) {
      return `/products?category=${encodeURIComponent(categories.join(','))}`;
    }
  }
  return '/products';
}
