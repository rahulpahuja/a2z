// Which other articles to suggest, and which two sit either side of this one in time.
// Works on the lightweight index records, so it never needs article bodies.

const byNewest = (a, b) => b.publishedAt - a.publishedAt || a.id.localeCompare(b.id);

// Same category scores 2, each shared tag scores 1, a shared primary collection scores 2. Ties go to the
// newer article; articles that share nothing are not "related" and are left out.
export function pickRelatedPosts(post, entries, limit = 3) {
  const tags = new Set(post.tags ?? []);
  return (entries ?? [])
    .filter((e) => e.id !== post.id)
    .map((entry) => {
      let score = 0;
      if (post.categoryId && entry.categoryId === post.categoryId) score += 2;
      if (post.primaryCollectionId && entry.primaryCollectionId === post.primaryCollectionId) score += 2;
      for (const tag of entry.tags ?? []) if (tags.has(tag)) score += 1;
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || byNewest(a.entry, b.entry))
    .slice(0, limit)
    .map(({ entry }) => entry);
}

// `newer` was published after this article, `older` before it. Either can be null at the ends.
export function getNeighbours(post, entries) {
  const sorted = [...(entries ?? [])].sort(byNewest);
  const index = sorted.findIndex((e) => e.id === post.id);
  if (index === -1) return { newer: null, older: null };
  return { newer: sorted[index - 1] ?? null, older: sorted[index + 1] ?? null };
}

// Filters the landing page list. Every active filter must match; the search matches title, excerpt,
// tags and the stored article text, ignoring case and extra spaces.
export function filterEntries(entries, { query = '', categoryId = '', tag = '' } = {}) {
  const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean);
  return (entries ?? []).filter((e) => {
    if (categoryId && e.categoryId !== categoryId) return false;
    if (tag && !(e.tags ?? []).includes(tag)) return false;
    if (!terms.length) return true;
    const haystack = `${e.title} ${e.excerpt} ${(e.tags ?? []).join(' ')} ${e.searchText ?? ''}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

// The most used tags, most frequent first.
export function topTags(entries, limit = 12) {
  const counts = new Map();
  for (const e of entries ?? []) for (const tag of e.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([tag, count]) => ({ tag, count }));
}

// The public address of an article for the given site origin.
export const buildBlogUrl = (slug, origin) => `${String(origin).replace(/\/$/, '')}/blogs/${encodeURIComponent(slug)}`;

export function formatPublishedDate(ms, locale = 'en-IN') {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  return new Date(ms).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}
