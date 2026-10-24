export const MAX_SLUG_LENGTH = 80;

// Path segments the blog routes could use for something else.
export const RESERVED_SLUGS = new Set(['new', 'preview', 'tag', 'category', 'page']);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Lower-case, accent-free, hyphen-separated. Returns '' when nothing usable is left
// (e.g. a title written only in Devanagari), so callers can fall back to something else.
export function slugify(input) {
  return String(input ?? '')
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
}

export function isValidSlug(slug) {
  return typeof slug === 'string' && slug.length > 0 && slug.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}

// The slug for a title, or a stable fallback built from the post id when the title has no
// Latin letters or digits.
export function slugFromTitle(title, id = '') {
  const slug = slugify(title);
  if (isValidSlug(slug)) return slug;
  const tail = slugify(String(id).slice(-8));
  return tail ? `post-${tail}`.slice(0, MAX_SLUG_LENGTH) : 'post';
}

// `isTaken(slug)` says whether another post already owns it. Appends -2, -3… until free.
export function uniqueSlug(base, isTaken) {
  const root = isValidSlug(base) ? base : slugFromTitle(base);
  if (!isTaken(root)) return root;
  for (let n = 2; n < 1000; n += 1) {
    const suffix = `-${n}`;
    const candidate = `${root.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/g, '')}${suffix}`;
    if (!isTaken(candidate)) return candidate;
  }
  return `${root.slice(0, 60)}-${Date.now().toString(36)}`;
}
