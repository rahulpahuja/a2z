import { describe, it, expect } from 'vitest';
import {
  formatDescription,
  fixSpelling,
  findDuplicatePhrases,
  diffDescription,
  applyDescriptionChanges,
} from './descriptionFormat.js';
import { parseDescription } from './richText.js';

const SAMPLES = [
  '',
  '   \n\n  ',
  'A soft cotton kurti set.',
  'soft cotton kurti set with relaxed fit',
  'Colour & Base Fabric: Vibrant red cotton Design & Pattern: Floral block print Occasion: Festive wear',
  'Festive kurti for the season.\r\n\r\n* Soft cotton\r\n• Relaxed fit\r\n-   Machine wash',
  'Color: Red\nFabric: Silk\nWork: Zari',
  'Intro line here that runs a bit long. Colour: Red. Fabric: Cotton.',
  'beautiful jewelry inspired design,perfect for weddings!!  Pair it with gold  jewelry .. e.g. a necklace',
  'Wear it anywhere. wear it anywhere you like. Wear it anywhere!',
  '100% cotton. approx. 5 cm border. i.e. a light fabric',
  '<script>alert(1)</script> kurti for everyday wear',
  'Cartoon Graphic Wide-Leg Cargo Pants feature a relaxed fit for a fun look. Designed with a comfortable elasticated waistband, adjustable drawstring, spacious cargo pockets, and a lightweight feel, these pants combine comfort with style. Perfect for casual outings, Korean-inspired outfits, and trendy urban looks.',
  'Soft cotton kurta for daily wear. It stays comfortable all day. Machine wash cold.',
  'Perfect for pairing with jeans, cargo pants, or skirts for a chic look. Ideal for casual outings, travel, parties, and everyday fashion. Machine wash.',
];

describe('formatDescription', () => {
  it('returns an empty string for empty or whitespace-only input', () => {
    expect(formatDescription('')).toBe('');
    expect(formatDescription('  \n \n ')).toBe('');
    expect(formatDescription(undefined)).toBe('');
  });

  it('is idempotent for every sample', () => {
    SAMPLES.forEach((sample) => {
      const once = formatDescription(sample);
      expect(formatDescription(once), JSON.stringify(sample)).toBe(once);
    });
  });

  it('normalises CRLF, whitespace and blank-line runs', () => {
    expect(formatDescription('One  fine   kurti for you.\r\n\r\n\r\n\r\nSecond paragraph of text here.')).toBe(
      'One fine kurti for you.\n\nSecond paragraph of text here.',
    );
  });

  it('splits labelled runs into one bullet per label and keeps their wording', () => {
    const out = formatDescription('Colour & Base Fabric: Vibrant red cotton Design & Pattern: Floral block print Occasion: Festive wear');
    expect(out).toBe(
      '- Colour & Base Fabric: Vibrant red cotton\n- Design & Pattern: Floral block print\n- Occasion: Festive wear',
    );
    expect(parseDescription(out)).toEqual([
      { type: 'list', items: ['Colour & Base Fabric: Vibrant red cotton', 'Design & Pattern: Floral block print', 'Occasion: Festive wear'] },
    ]);
  });

  it('keeps leading prose as a paragraph when a line also holds labels', () => {
    expect(formatDescription('A festive kurti for the season. Fabric: Cotton. Fit: Relaxed.')).toBe(
      'A festive kurti for the season.\n- Fabric: Cotton.\n- Fit: Relaxed.',
    );
  });

  it('turns adjacent single-label lines into a list but leaves a lone label line alone', () => {
    expect(formatDescription('Color: Red\nFabric: Silk')).toBe('- Colour: Red\n- Fabric: Silk');
    expect(formatDescription('Fabric: Silk')).toBe('Fabric: Silk');
  });

  it('canonicalises bullet markers', () => {
    expect(formatDescription('* Soft cotton\n•   Relaxed fit')).toBe('- Soft cotton\n- Relaxed fit');
  });

  it('fixes sentence casing and end punctuation without touching short headings', () => {
    expect(formatDescription('soft cotton kurti set with relaxed fit')).toBe('Soft cotton kurti set with relaxed fit.');
    expect(formatDescription('Product Details')).toBe('Product Details');
    expect(formatDescription('wear it now. then wash it gently')).toBe('Wear it now. Then wash it gently.');
  });

  it('does not capitalise after abbreviations', () => {
    expect(formatDescription('Border is approx. five cm wide, i.e. quite slim and light.')).toBe(
      'Border is approx. five cm wide, i.e. quite slim and light.',
    );
  });

  it('fixes spacing around punctuation and repeated marks', () => {
    expect(formatDescription('Lovely design,perfect for weddings!!  Truly elegant .')).toBe('Lovely design, perfect for weddings! Truly elegant.');
  });

  it('leaves HTML-looking text as text', () => {
    expect(formatDescription('<script>alert(1)</script> kurti for everyday wear')).toBe('<script>alert(1)</script> kurti for everyday wear.');
  });

  it('applies the India-English whitelist, preserving case', () => {
    expect(formatDescription('Color and jewelry matching, COLORS pop.')).toBe('Colour and jewellery matching, COLOURS pop.');
    expect(fixSpelling('Colorful pajamas at the center')).toBe('Colourful pyjamas at the centre');
  });

  it('leaves colour names and unlisted words alone', () => {
    expect(fixSpelling('Gray and grey; colourful already; recolor')).toBe('Gray and grey; colourful already; recolor');
  });
});

describe('findDuplicatePhrases', () => {
  it('reports phrases of four or more words that repeat', () => {
    const found = findDuplicatePhrases('Wear it anywhere you like. Pair it with jeans. Wear it anywhere you like!');
    expect(found).toEqual([{ phrase: 'wear it anywhere you like', count: 2 }]);
  });

  it('ignores short repeats and stopword-only runs', () => {
    expect(findDuplicatePhrases('Soft cotton. Soft cotton kurti. In the of the.')).toEqual([]);
    expect(findDuplicatePhrases('')).toEqual([]);
  });
});

describe('diffDescription and applyDescriptionChanges', () => {
  const before = 'Festive kurti\nColor: Red Fabric: Silk\nlast line stays here fine';

  it('groups differing lines into numbered changes', () => {
    const segments = diffDescription(before, formatDescription(before));
    const changes = segments.filter((s) => s.type === 'change');
    expect(changes.length).toBeGreaterThan(0);
    expect(changes.map((c) => c.id)).toEqual(changes.map((_c, index) => index));
  });

  it('applies every change when all are accepted and none when all are rejected', () => {
    const after = formatDescription(before);
    const segments = diffDescription(before, after);
    expect(applyDescriptionChanges(segments, () => true)).toBe(after);
    expect(applyDescriptionChanges(segments, () => false)).toBe(before);
  });

  it('applies a subset of changes', () => {
    const text = 'wear it today\n\nsecond paragraph is here too';
    const segments = diffDescription(text, formatDescription(text));
    const changes = segments.filter((s) => s.type === 'change');
    expect(changes).toHaveLength(2);
    expect(applyDescriptionChanges(segments, (id) => id === 0)).toBe('Wear it today\n\nsecond paragraph is here too');
  });

  it('returns no changes for already-formatted text', () => {
    const text = formatDescription('Soft cotton kurti set for festive wear.');
    expect(diffDescription(text, formatDescription(text)).every((s) => s.type === 'same')).toBe(true);
  });
});

describe('formatDescription: paragraph into intro, feature bullets and occasion bullets', () => {
  const CARGO =
    'Cartoon Graphic Wide-Leg Cargo Pants feature a relaxed, oversized silhouette with playful cartoon graphics for a fun streetwear look. ' +
    'Designed with a comfortable elasticated waistband, adjustable drawstring, spacious cargo pockets, and a lightweight feel, these pants combine everyday comfort with eye-catching style. ' +
    'Perfect for casual outings, Korean-inspired outfits, and trendy urban looks.';

  it('splits a plain paragraph into an intro, a feature list and a "Perfect for:" list', () => {
    expect(formatDescription(CARGO)).toBe(
      [
        'Cartoon Graphic Wide-Leg Cargo Pants feature a relaxed, oversized silhouette with playful cartoon graphics for a fun streetwear look.',
        '',
        'Designed with:',
        '- Comfortable elasticated waistband',
        '- Adjustable drawstring',
        '- Spacious cargo pockets',
        '- Lightweight feel',
        '',
        'These pants combine everyday comfort with eye-catching style.',
        '',
        'Perfect for:',
        '- Casual outings',
        '- Korean-inspired outfits',
        '- Trendy urban looks',
      ].join('\n'),
    );
  });

  it('renders as paragraphs and lists the storefront can display', () => {
    expect(parseDescription(formatDescription(CARGO)).map((block) => block.type)).toEqual([
      'paragraph', // intro
      'paragraph', // "Designed with:"
      'list',
      'paragraph', // "These pants combine ..."
      'paragraph', // "Perfect for:"
      'list',
    ]);
  });

  it('keeps every word of the original (nothing is dropped)', () => {
    const words = (text) => text.toLowerCase().match(/[a-z-]+/g).filter((word) => !['a', 'an', 'the', 'and', 'for'].includes(word));
    const kept = new Set(words(formatDescription(CARGO)));
    words(CARGO).forEach((word) => expect(kept.has(word), word).toBe(true));
  });

  it('leaves a sentence alone when its "list" is not a clean list', () => {
    const out = formatDescription(
      'A bomber jacket for the street. Perfect for pairing with high-waisted jeans, cargo pants, or skirts for a chic streetwear look. Ideal for casual outings, travel, parties, and everyday fashion.',
    );
    expect(out).toContain('Perfect for pairing with high-waisted jeans, cargo pants, or skirts for a chic streetwear look.');
    expect(out).not.toContain('- Pairing');
    expect(out).toContain('Ideal for:\n- Casual outings\n- Travel\n- Parties\n- Everyday fashion');
  });

  it('falls back to one bullet per sentence when no list is found', () => {
    expect(formatDescription('Soft cotton kurta for daily wear. It stays comfortable all day. Machine wash cold.')).toBe(
      'Soft cotton kurta for daily wear.\n\n- It stays comfortable all day.\n- Machine wash cold.',
    );
  });

  it('does not restructure short, multi-paragraph, bulleted or labelled text', () => {
    expect(formatDescription('A soft cotton kurti set. Perfect for weddings, parties, and festive days.')).toBe(
      'A soft cotton kurti set. Perfect for weddings, parties, and festive days.',
    );
    expect(formatDescription('First one is here. It has two. And three.\n\nSecond paragraph.')).toBe(
      'First one is here. It has two. And three.\n\nSecond paragraph.',
    );
    expect(formatDescription('Intro line.\n- One\n- Two\n- Three')).toBe('Intro line.\n- One\n- Two\n- Three');
  });

  it('is stable: a restructured description is not restructured again', () => {
    const once = formatDescription(CARGO);
    expect(formatDescription(once)).toBe(once);
  });

  it('offers the restructure as a single change the admin can accept or reject', () => {
    const segments = diffDescription(CARGO, formatDescription(CARGO));
    expect(segments.filter((segment) => segment.type === 'change')).toHaveLength(1);
    expect(applyDescriptionChanges(segments, () => false)).toBe(CARGO);
    expect(applyDescriptionChanges(segments, () => true)).toBe(formatDescription(CARGO));
  });
});
