// Behavioural check for the `blogs` node of database.rules.json, against the Realtime Database emulator
// (see scripts/lib/rtdb-emulator.mjs).   node scripts/check-blog-rules.mjs
import { startEmulator } from './lib/rtdb-emulator.mjs';

const { call, expect, summary } = await startEmulator({ ns: 'a2z-blog-rules-check' });

const body = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
const post = (id, over = {}) => ({ id, title: 'Hello', status: 'draft', body, slug: 'hello', ...over });
const pub = (id, over = {}) => ({ id, slug: 'hello', title: 'Hello', body, status: 'published', publishedAt: 1, ...over });
const idx = (id, over = {}) => ({ id, slug: 'hello', title: 'Hello', publishedAt: 1, ...over });

console.log('--- anonymous visitors and customers can read only what is published');
await call('PUT', 'blogs/admin/b1', 'owner', post('b1'));
await call('PUT', 'blogs/slugClaims/hello', 'owner', 'b1');
await call('PUT', 'blogs/public/b2', 'owner', pub('b2', { slug: 'live' }));
await call('PUT', 'blogs/index/b2', 'owner', idx('b2', { slug: 'live' }));
await call('PUT', 'blogs/slugs/live', 'owner', 'b2');
await call('PUT', 'blogs/redirects/old', 'owner', 'live');
await call('PUT', 'blogs/categories/style', 'owner', { name: 'Style', slug: 'style' });
for (const who of ['anon', 'customer']) {
  for (const path of ['blogs/public', 'blogs/index', 'blogs/slugs/live', 'blogs/redirects/old', 'blogs/categories'])
    await expect(`${who}: read ${path}`, true, () => call('GET', path, who));
  for (const path of ['blogs/admin', 'blogs/admin/b1', 'blogs/slugClaims', 'blogs/slugClaims/hello', 'blogs'])
    await expect(`${who}: read ${path} (private)`, false, () => call('GET', path, who));
  await expect(`${who}: query drafts by status`, false, () => call('GET', 'blogs/admin?orderBy=%22status%22&equalTo=%22draft%22', who));
}

console.log('--- only a super user can write');
for (const who of ['anon', 'customer']) {
  await expect(`${who}: create a draft`, false, () => call('PUT', 'blogs/admin/x1', who, post('x1')));
  await expect(`${who}: publish`, false, () => call('PUT', 'blogs/public/x1', who, pub('x1')));
  await expect(`${who}: add an index entry`, false, () => call('PUT', 'blogs/index/x1', who, idx('x1')));
  await expect(`${who}: add a redirect`, false, () => call('PUT', 'blogs/redirects/evil', who, 'live'));
  await expect(`${who}: delete a published article`, false, () => call('DELETE', 'blogs/public/b2', who));
  await expect(`${who}: add a category`, false, () => call('PUT', 'blogs/categories/c', who, { name: 'C', slug: 'c' }));
}

console.log('--- the super user writes valid data');
await expect('admin: create a draft', true, () => call('PUT', 'blogs/admin/a1', 'admin', post('a1', { slug: 'a-one' })));
await expect('admin: publish with a multi-path update', true, () =>
  call('PATCH', '', 'admin', { 'blogs/public/a1': pub('a1', { slug: 'a-one' }), 'blogs/index/a1': idx('a1', { slug: 'a-one' }), 'blogs/slugs/a-one': 'a1', 'blogs/admin/a1': post('a1', { slug: 'a-one', status: 'published' }) })
);
await expect('admin: add a redirect', true, () => call('PUT', 'blogs/redirects/older-name', 'admin', 'a-one'));
await expect('admin: read the drafts', true, () => call('GET', 'blogs/admin', 'admin'));
await expect('admin: query by status (indexed)', true, () => call('GET', 'blogs/admin?orderBy=%22status%22&equalTo=%22scheduled%22', 'admin'));
await expect('admin: unpublish (delete public copy)', true, () => call('DELETE', 'blogs/public/a1', 'admin'));
await expect('admin: add a category', true, () => call('PUT', 'blogs/categories/care', 'admin', { name: 'Care', slug: 'care' }));

console.log('--- the super user cannot write malformed data either');
await expect('admin: draft with an unknown status', false, () => call('PUT', 'blogs/admin/z1', 'admin', post('z1', { status: 'live' })));
await expect('admin: draft whose id does not match its key', false, () => call('PUT', 'blogs/admin/z1', 'admin', post('other')));
await expect('admin: draft with no title field', false, () => call('PUT', 'blogs/admin/z1', 'admin', { id: 'z1', status: 'draft', body }));
await expect('admin: draft with an oversized body', false, () => call('PUT', 'blogs/admin/z1', 'admin', post('z1', { body: 'x'.repeat(300001) })));
await expect('admin: draft with an invalid slug', false, () => call('PUT', 'blogs/admin/z1', 'admin', post('z1', { slug: 'Bad Slug' })));
await expect('admin: public copy that is not published', false, () => call('PUT', 'blogs/public/z1', 'admin', pub('z1', { status: 'draft' })));
await expect('admin: public copy without a body', false, () => call('PUT', 'blogs/public/z1', 'admin', { id: 'z1', slug: 'z', title: 'T', status: 'published', publishedAt: 1 }));
await expect('admin: public copy with a bad slug', false, () => call('PUT', 'blogs/public/z1', 'admin', pub('z1', { slug: 'a/b' })));
await expect('admin: slug map with an invalid slug key', false, () => call('PUT', 'blogs/slugs/Bad_Slug', 'admin', 'z1'));
await expect('admin: slug map with a non-string value', false, () => call('PUT', 'blogs/slugs/fine-slug', 'admin', { id: 'z1' }));
await expect('admin: redirect to an invalid target', false, () => call('PUT', 'blogs/redirects/old-two', 'admin', 'Not A Slug'));
await expect('admin: slug claim with an invalid slug', false, () => call('PUT', 'blogs/slugClaims/Bad_Slug', 'admin', 'z1'));
await expect('admin: category without a name', false, () => call('PUT', 'blogs/categories/c2', 'admin', { slug: 'c2' }));
await expect('admin: index entry with an oversized search text', false, () => call('PUT', 'blogs/index/z1', 'admin', idx('z1', { searchText: 'x'.repeat(3300) })));

summary();
