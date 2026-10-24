import { normalizePost } from '../utils/blog/post.js';
import { isValidSlug } from '../utils/blog/slug.js';
import { blogNotFoundHead, buildBlogPostHead } from './blogHead.js';

// What the edge function should do for /blogs/<slug>. `read(path)` fetches a public database path.
// Only published articles resolve: drafts, scheduled and archived ones are not in the public tree, so a
// crawler gets the same 404 as any unknown address. A changed slug answers with a permanent redirect.
export async function resolveBlogRoute(read, rawSlug) {
  const slug = String(rawSlug ?? '').toLowerCase();
  if (!isValidSlug(slug)) return { kind: 'notfound', status: 404, head: blogNotFoundHead() };

  const id = await read(`blogs/slugs/${slug}`);
  if (typeof id === 'string' && id) {
    const record = await read(`blogs/public/${encodeURIComponent(id)}`);
    if (record && record.status === 'published') {
      const post = normalizePost({ ...record, id });
      const category = post.categoryId ? await read(`blogs/categories/${encodeURIComponent(post.categoryId)}`).catch(() => null) : null;
      return { kind: 'ok', status: 200, head: buildBlogPostHead(post, { categoryName: category?.name ?? '' }) };
    }
  }

  const target = await read(`blogs/redirects/${slug}`);
  if (typeof target === 'string' && isValidSlug(target) && target !== slug) return { kind: 'redirect', status: 301, location: `/blogs/${target}` };
  return { kind: 'notfound', status: 404, head: blogNotFoundHead() };
}
