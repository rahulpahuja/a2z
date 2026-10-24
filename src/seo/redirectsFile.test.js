// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Netlify applies public/_redirects top to bottom, before netlify.toml, and the first match wins. A rule placed
// after the `/* -> /index.html` catch-all would never run, so the sitemap rule must come before it.
describe('public/_redirects', () => {
  const rules = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const index = (from) => rules.findIndex((r) => r.split(/\s+/)[0] === from);

  it('serves the blog sitemap from its function before the single-page-app catch-all', () => {
    expect(index('/blog-sitemap.xml')).toBeGreaterThanOrEqual(0);
    expect(index('/blog-sitemap.xml')).toBeLessThan(index('/*'));
    expect(rules[index('/blog-sitemap.xml')]).toContain('/.netlify/functions/blog-sitemap');
  });

  it('keeps the catch-all last', () => {
    expect(index('/*')).toBe(rules.length - 1);
  });
});
