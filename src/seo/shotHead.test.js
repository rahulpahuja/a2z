import { describe, it, expect } from 'vitest';
import { buildShotHead } from './shotHead.js';
import { renderHeadTags } from './head.js';

const product = { id: 'p1', title: 'Rider Jacket', description: 'A <b>bold</b> jacket.', images: ['https://cdn.test/a.jpg'] };

describe('buildShotHead', () => {
  it('previews the product and keeps the deep link out of search results', () => {
    const head = buildShotHead(product, 'p1_0');
    expect(head.title).toBe('Rider Jacket on Shots | A2Z Collection');
    expect(head.canonical).toBe('https://www.thea2zcollection.com/shots?v=p1_0');
    expect(head.robots).toMatch(/noindex/);
    expect(head.ogImage).toBe('https://cdn.test/a.jpg');
  });

  it('falls back sensibly when the product has no image or description', () => {
    const head = buildShotHead({ id: 'p2', name: 'Plain Tee' }, 'p2_1');
    expect(head.description).toBe('Watch Plain Tee on A2Z Collection Shots.');
    expect(head.ogImage).toBeUndefined();
  });

  it('renders valid, escaped tags', () => {
    const tags = renderHeadTags(buildShotHead({ ...product, title: 'A "quoted" <name>' }, 'p1_0'));
    expect(tags).not.toContain('<name>');
    expect(tags).toContain('&lt;name&gt;');
  });
});
