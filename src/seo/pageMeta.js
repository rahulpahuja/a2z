// Admin-managed overrides for a static route's head: a custom title/description plus
// any extra <meta> tags. Pure so the browser (RouteMeta) and the Netlify Edge Function
// apply them identically.

export const META_ATTRS = ['name', 'property'];
const META_KEY = /^[A-Za-z][\w:.-]*$/;

export const isValidMetaKey = (key) => META_KEY.test(key);

// Realtime Database keys can't contain "/" or ".", so '/shipping-policy' is stored as 'shipping-policy'.
export const pageMetaKey = (path) => (path === '/' ? '_home' : path.replace(/^\//, '').replace(/\//g, '__'));

// Keeps only well-formed tags; a repeated name/property keeps the last value.
export function sanitizeMetaTags(tags) {
  const byKey = new Map();
  Object.values(tags ?? {}).forEach(({ attr, key, content } = {}) => {
    const cleanKey = String(key ?? '').trim();
    const cleanContent = String(content ?? '').trim();
    if (!META_ATTRS.includes(attr) || !isValidMetaKey(cleanKey) || !cleanContent) return;
    byKey.set(`${attr}:${cleanKey}`, { attr, key: cleanKey, content: cleanContent });
  });
  return [...byKey.values()];
}

export function applyPageMeta(head, entry) {
  if (!entry) return head;
  return {
    ...head,
    title: entry.title?.trim() || head.title,
    description: entry.description?.trim() || head.description,
    extraMeta: sanitizeMetaTags(entry.metaTags),
  };
}
