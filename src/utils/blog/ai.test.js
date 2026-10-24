import { describe, it, expect } from 'vitest';
import { buildAiPrompt, draftToDoc, listSections, parseAiResponse, productFacts, replaceSection, sectionToNodes } from './ai.js';

const product = { id: 'p1', name: 'Rider Jacket', price: 3000, discountUnit: 'PERCENTAGE', discountValue: 10, category: 'Jackets', gender: 'Male', colors: [{ name: 'Black', sizes: [{ size: 'M', stock: 3 }] }], description: 'A sturdy jacket.', care: 'Dry clean' };

describe('productFacts', () => {
  it('includes only what the catalogue holds, with the live price', () => {
    const facts = productFacts(product);
    expect(facts).toMatchObject({ id: 'p1', name: 'Rider Jacket', category: 'Jackets', gender: 'Male', price_inr: 2700, original_price_inr: 3000, colours: ['Black'], sizes: ['M'], in_stock: true, care: 'Dry clean' });
    expect(facts.description).toBe('A sturdy jacket.');
    expect(facts.origin).toBeUndefined();
    expect(Object.keys(productFacts({ id: 'x', name: 'Plain', price: 100 }))).not.toContain('colours');
  });
});

describe('buildAiPrompt', () => {
  const base = { type: 'multi', topic: 'Top picks', products: [productFacts(product)] };

  it('forbids invention and carries the verified data', () => {
    const { system, user } = buildAiPrompt(base);
    expect(system).toMatch(/ONLY the facts supplied/);
    expect(system).toMatch(/Never invent/);
    expect(system).toMatch(/reviews, ratings/);
    expect(user).toContain('Rider Jacket');
    expect(user).toContain('"price_inr": 2700');
    expect(user).toContain('Multi-Product Feature');
  });

  it('applies tone, length and language, falling back for unknown values', () => {
    expect(buildAiPrompt({ ...base, tone: 'playful and trendy', length: 'long', language: 'Hindi' }).user).toMatch(/Tone: playful and trendy[\s\S]*Language: Hindi[\s\S]*1200-1500 words/);
    expect(buildAiPrompt({ ...base, tone: 'angry', length: 'huge' }).user).toMatch(/Tone: warm and friendly[\s\S]*700-900 words/);
  });

  it('asks for just one section when regenerating, with context', () => {
    const { user } = buildAiPrompt({ ...base, section: { heading: 'Fit guide', index: 1 }, currentText: 'Existing text.' });
    expect(user).toContain('Rewrite ONLY the section titled "Fit guide"');
    expect(user).toContain('Existing text.');
    expect(user).not.toContain('Write the full article');
  });

  it('limits free-text input', () => {
    expect(buildAiPrompt({ ...base, instructions: 'x'.repeat(5000) }).user.length).toBeLessThan(9000);
  });
});

describe('parseAiResponse', () => {
  const reply = JSON.stringify({
    title: 'Our Picks', excerpt: 'Short.', seoTitle: 'Picks', seoDescription: 'Desc', tags: ['Jackets', ' Style '],
    sections: [
      { heading: 'Jacket', paragraphs: ['Sturdy.'], bullets: ['Black'], productId: 'p1' },
      { heading: 'Ghost', paragraphs: ['x'], productId: 'invented-id' },
    ],
  });

  it('parses a clean reply, lower-cases tags and drops product ids that were not supplied', () => {
    const draft = parseAiResponse(reply, ['p1']);
    expect(draft.tags).toEqual(['jackets', 'style']);
    expect(draft.sections[0].productId).toBe('p1');
    expect(draft.sections[1].productId).toBe('');
  });

  it('copes with code fences and chatter around the JSON', () => {
    expect(parseAiResponse('Here you go:\n```json\n' + reply + '\n```', ['p1']).title).toBe('Our Picks');
  });

  it('rejects unusable replies', () => {
    for (const bad of ['', 'not json', '{}', '{"sections":[]}', '{"sections":"nope"}', null, undefined]) expect(parseAiResponse(bad, ['p1'])).toBeNull();
  });

  it('caps lengths so a runaway reply cannot flood the editor', () => {
    const big = JSON.stringify({ title: 'x'.repeat(999), sections: Array.from({ length: 40 }, () => ({ heading: 'h', paragraphs: Array.from({ length: 30 }, () => 'y'.repeat(9000)) })) });
    const draft = parseAiResponse(big, []);
    expect(draft.title.length).toBe(160);
    expect(draft.sections.length).toBeLessThanOrEqual(14);
    expect(draft.sections[0].paragraphs.length).toBeLessThanOrEqual(8);
    expect(draft.sections[0].paragraphs[0].length).toBe(2000);
  });
});

describe('draft to document', () => {
  const draft = parseAiResponse(JSON.stringify({ sections: [{ heading: 'One', paragraphs: ['a'], productId: 'p1' }, { heading: 'Two', paragraphs: ['b'], bullets: ['x', 'y'] }] }), ['p1']);

  it('builds headings, paragraphs, lists and product cards only where the AI chose them', () => {
    const doc = draftToDoc(draft);
    expect(doc.content.map((n) => n.type)).toEqual(['heading', 'paragraph', 'productCard', 'heading', 'paragraph', 'bulletList']);
    expect(doc.content[2].attrs.productId).toBe('p1');
  });

  it('treats any markup in the text as plain text', () => {
    const doc = draftToDoc({ sections: [{ heading: '<script>x</script>', paragraphs: ['<img onerror=x>'], bullets: [], productId: '' }] });
    expect(JSON.stringify(doc)).not.toContain('"script"');
    expect(doc.content[1].content[0].text).toBe('<img onerror=x>');
  });

  it('replaces one section and leaves the others alone', () => {
    const doc = draftToDoc(draft);
    expect(listSections(doc)).toEqual([{ index: 0, heading: 'One' }, { index: 1, heading: 'Two' }]);
    const next = replaceSection(doc, 1, sectionToNodes({ heading: 'Two (new)', paragraphs: ['fresh'], bullets: [], productId: '' }));
    expect(listSections(next).map((s) => s.heading)).toEqual(['One', 'Two (new)']);
    expect(next.content.slice(0, 3)).toEqual(doc.content.slice(0, 3));
    expect(JSON.stringify(next)).not.toContain('"x"');
  });

  it('ignores a section that does not exist', () => {
    const doc = draftToDoc(draft);
    expect(replaceSection(doc, 9, [])).toEqual(doc);
    expect(replaceSection(doc, -1, [])).toEqual(doc);
  });
});
