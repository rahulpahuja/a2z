import { onValue, ref, set } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const PATH = 'settings/topNav';

export const DEFAULT_TOP_NAV_LINKS = [
  { id: 'nav_new_arrivals', label: 'New Arrivals', type: 'all' },
  { id: 'nav_kurti', label: 'Kurtis', type: 'category', category: 'Kurti' },
];

function normalizeNavLinks(val) {
  let list = [];
  if (Array.isArray(val)) {
    list = [...val];
  } else if (val && typeof val === 'object') {
    list = Object.values(val);
  } else {
    list = [...DEFAULT_TOP_NAV_LINKS];
  }

  // Guarantee 'New Arrivals' is always present in top navigation
  if (!list.some((item) => item?.type === 'all' || item?.label?.toLowerCase() === 'new arrivals')) {
    list.unshift({ id: 'nav_new_arrivals', label: 'New Arrivals', type: 'all' });
  }
  return list;
}

function getLocalTopNav() {
  try {
    const data = localStorage.getItem(PATH);
    return data ? normalizeNavLinks(JSON.parse(data)) : DEFAULT_TOP_NAV_LINKS;
  } catch {
    return DEFAULT_TOP_NAV_LINKS;
  }
}

function setLocalTopNav(links) {
  try {
    localStorage.setItem(PATH, JSON.stringify(links));
  } catch {
    // Ignore localStorage errors
  }
}

const listeners = new Set();
function notifyListeners() {
  const data = getLocalTopNav();
  listeners.forEach((listener) => listener(data, null));
}

export function subscribeToTopNav(callback) {
  // Always invoke immediately with local/default links for instant 0ms render
  const initial = getLocalTopNav();
  try {
    callback(initial, null);
  } catch {
    // Ignore callback errors on initial invocation
  }

  if (!isFirebaseEnabled) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }

  return onValue(
    ref(db, PATH),
    (snapshot) => {
      const raw = snapshot.exists() ? snapshot.val() : DEFAULT_TOP_NAV_LINKS;
      const normalized = normalizeNavLinks(raw);
      setLocalTopNav(normalized);
      callback(normalized, null);
    },
    (error) => callback(initial, error)
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
  if (link.type === 'all' && (link.label?.toLowerCase() === 'new arrivals' || link.id === 'nav_new_arrivals')) {
    return '/products?filter=new-arrivals';
  }
  return '/products';
}
