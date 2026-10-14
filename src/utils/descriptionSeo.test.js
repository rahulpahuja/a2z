import { describe, it, expect } from 'vitest';
import { analyzeDescription, findContradictions, extractKeywords } from './descriptionSeo.js';

const byId = (result, id) => result.checks.find((c) => c.id === id);

const GOOD =
  'This Rani Kurti set is cut from soft cotton with a relaxed straight fit. ' +
  'The yoke carries fine machine embroidery, and the pants are light enough for warm days. ' +
  'Pair it with simple jewellery for a festive look.';

// The BLUESKY 08 listing: the text calls the kurta a "vibrant red colour" while the
// product is sold in five colours.
const BLUESKY = {
  title: 'BLUESKY 08 Kurti Set',
  categoryTitle: 'Kurti',
  hashtags: ['#kurti', '#festive'],
  gender: 'Female',
  sizes: ['S', 'M', 'L', 'XL'],
  colors: ['Navy Blue', 'Black', 'Brown', 'Red', 'White'].map((name) => ({ name })),
};

const product = {
  title: 'Rani Kurti Set',
  categoryTitle: 'Kurti',
  hashtags: ['#festive'],
  gender: 'Female',
  sizes: ['S', 'M', 'L'],
  colors: [{ name: 'Rani Pink' }, { name: 'Navy Blue' }],
};

describe('extractKeywords', () => {
  it('stems words from title, category and hashtags and drops generic ones', () => {
    expect(extractKeywords({ title: 'Silk Sarees for Women', categoryTitle: 'Saree', hashtags: ['#festive'] }).sort()).toEqual(['festive', 'saree', 'silk']);
  });

  it('accepts hashtags as a string', () => {
    expect(extractKeywords({ title: '', hashtags: '#festive, #silk' }).sort()).toEqual(['festive', 'silk']);
  });
});

describe('analyzeDescription basics', () => {
  it('passes a well-formed description', () => {
    const result = analyzeDescription(GOOD, product);
    expect(result.checks.map((c) => `${c.id}:${c.status}`)).toEqual([
      'length:pass',
      'meta:pass',
      'keyword:pass',
      'stuffing:pass',
      'readability:pass',
      'duplicates:pass',
      'contradictions:pass',
    ]);
    expect(result.summary).toEqual({ pass: 7, warn: 0, fail: 0 });
  });

  it('fails an empty description without throwing', () => {
    const result = analyzeDescription('', product);
    expect(byId(result, 'length').status).toBe('fail');
    expect(byId(result, 'meta').status).toBe('fail');
    expect(byId(result, 'readability').status).toBe('fail');
  });

  it('survives missing product context', () => {
    expect(() => analyzeDescription(GOOD)).not.toThrow();
    expect(byId(analyzeDescription(GOOD), 'keyword').status).toBe('warn');
  });
});

describe('length', () => {
  it('fails short, warns borderline and warns when very long', () => {
    expect(byId(analyzeDescription('Soft kurti.', product), 'length').status).toBe('fail');
    expect(byId(analyzeDescription('A soft cotton kurti set with a relaxed fit and embroidery on the yoke, easy to wear.', product), 'length').status).toBe('warn');
    expect(byId(analyzeDescription(`${GOOD} ${'Extra words go here. '.repeat(70)}`, product), 'length').status).toBe('warn');
  });
});

describe('search snippet', () => {
  it('warns when the text opens with a spec label', () => {
    const text = `Colour & Base Fabric: Navy cotton. ${GOOD}`;
    const meta = byId(analyzeDescription(text, product), 'meta');
    expect(meta.status).toBe('warn');
    expect(meta.message).toMatch(/spec label/);
  });

  it('warns when the first 160 characters hold no complete sentence', () => {
    const text = `${'soft cotton kurti with a relaxed straight fit and machine embroidery on the yoke and pants light for warm days'.repeat(2)}.`;
    expect(byId(analyzeDescription(text, product), 'meta').status).toBe('warn');
  });

  it('exposes the snippet used', () => {
    expect(byId(analyzeDescription(GOOD, product), 'meta').snippet.length).toBeLessThanOrEqual(160);
  });
});

describe('keyword placement', () => {
  it('warns when the keyword only appears after the first 100 characters', () => {
    const text = `A light and airy outfit that suits warm afternoons and long evenings alike, finished with fine details. The kurti runs true to size.`;
    expect(byId(analyzeDescription(text, product), 'keyword').status).toBe('warn');
  });

  it('fails when no keyword appears', () => {
    const text = 'A light and airy outfit that suits warm afternoons and long evenings alike, finished with fine details and care.';
    expect(byId(analyzeDescription(text, { title: 'Rani Kurti', categoryTitle: 'Kurti' }), 'keyword').status).toBe('fail');
  });
});

describe('keyword stuffing', () => {
  it('flags heavy repetition of one word', () => {
    const text = 'Kurti kurti kurti kurti kurti. Buy kurti, best kurti, cheap kurti, kurti online store.';
    expect(byId(analyzeDescription(text, product), 'stuffing').status).toBe('fail');
  });

  it('warns on moderate repetition and passes natural copy', () => {
    const moderate = 'This kurti is soft. The kurti has a relaxed cut. Wear the kurti with pants, scarves, and simple earrings for festive evenings.';
    expect(byId(analyzeDescription(moderate, product), 'stuffing').status).toBe('warn');
    expect(byId(analyzeDescription(GOOD, product), 'stuffing').status).toBe('pass');
  });
});

describe('readability', () => {
  it('flags very long sentences', () => {
    const long = `${'This soft cotton kurti is made for people who want something comfortable and easy to wear all day long '.repeat(4)}.`;
    expect(byId(analyzeDescription(long, product), 'readability').status).toBe('fail');
  });

  it('warns on mostly-capital text', () => {
    expect(byId(analyzeDescription('SOFT COTTON KURTI WITH RELAXED FIT. PERFECT FOR FESTIVE WEAR AND EVERYDAY.', product), 'readability').status).toBe('warn');
  });
});

describe('repeated phrases', () => {
  it('warns and reports the repeated phrase', () => {
    const text = `${GOOD} Wear it anywhere you like. Truly wear it anywhere you like.`;
    const dup = byId(analyzeDescription(text, product), 'duplicates');
    expect(dup.status).toBe('warn');
    expect(dup.duplicates[0].phrase).toBe('wear it anywhere you like');
  });
});

describe('contradictions', () => {
  it('flags a colour that is not in the listed colours', () => {
    const { items } = findContradictions('Beautiful green kurti with embroidery.', product);
    expect(items).toEqual([expect.objectContaining({ type: 'colour', term: 'green' })]);
  });

  it('treats a listed shade as covering its family and spelling variants', () => {
    expect(findContradictions('A navy and blue kurti', product).items).toEqual([]);
    expect(findContradictions('A grey kurti', { colors: [{ name: 'Gray' }] }).items).toEqual([]);
  });

  it('BLUESKY 08: red is a listed colour, so it is not a contradiction, but presenting it as THE colour is a warning', () => {
    const { items } = findContradictions('A kurti set in a vibrant red colour with relaxed fit.', BLUESKY);
    expect(items.map((item) => item.type)).toEqual(['colour-scope']);
    expect(items[0].message).toMatch(/5 colours/);
    expect(items[0].message).toMatch(/Navy Blue, Black, Brown, Red, White/);

    const result = analyzeDescription(`A kurti set in a vibrant red colour. ${GOOD}`, BLUESKY);
    expect(byId(result, 'contradictions').status).toBe('warn');
    expect(result.checks.some((c) => c.status === 'fail' && c.id === 'contradictions')).toBe(false);
  });

  it('BLUESKY 08: neutral wording about the colour range raises nothing', () => {
    expect(findContradictions('Kurti set available in navy, black, brown, red and white.', BLUESKY).items).toEqual([]);
  });

  it('does not raise the single-colour warning for a one-colour listing', () => {
    expect(findContradictions('A vibrant red colour kurti.', { colors: [{ name: 'Red' }] }).items).toEqual([]);
  });

  it('softens the message for "also available in red" phrasing and never fails', () => {
    const { items } = findContradictions('Also available in red.', product);
    expect(items).toHaveLength(1);
    expect(items[0].message).toMatch(/Ignore this if/);
    const result = analyzeDescription('Soft cotton kurti set. Also available in red.', product);
    expect(byId(result, 'contradictions').status).toBe('warn');
  });

  it('flags sizes that are not listed, including ranges and aliases', () => {
    expect(findContradictions('Available in sizes S, M, L and XL.', product).items.map((i) => i.term)).toEqual(['XL']);
    expect(findContradictions('Available in sizes S to XL.', product).items.map((i) => i.term).sort()).toEqual(['XL']);
    expect(findContradictions('Fits sizes S, M, L.', product).items).toEqual([]);
    expect(findContradictions('Also in 2XL', { ...product, sizes: ['XXL'] }).items).toEqual([]);
  });

  it('does not mistake ordinary capital letters for sizes', () => {
    expect(findContradictions('Series M is our favourite. Letter L stands for love.', product).items).toEqual([]);
  });

  it('flags gender wording that disagrees with the product gender', () => {
    expect(findContradictions('Perfect for men who love tradition.', product).items).toEqual([expect.objectContaining({ type: 'gender', term: 'men' })]);
    expect(findContradictions("A kurti for women's wardrobes.", { gender: 'Male' }).items).toEqual([expect.objectContaining({ type: 'gender', term: 'women' })]);
  });

  it('ignores "man-made" and does not check unisex products', () => {
    expect(findContradictions('Man-made fibre blend.', { gender: 'Female' }).items).toEqual([]);
    expect(findContradictions('Great for men and women.', { gender: 'Unisex' }).items).toEqual([]);
  });

  it('reports "not checked" when the listing has nothing to compare', () => {
    const check = byId(analyzeDescription(GOOD, { title: 'Rani Kurti' }), 'contradictions');
    expect(check.status).toBe('pass');
    expect(check.skipped).toBe(true);
    expect(check.message).toMatch(/Not checked/);
  });
});
