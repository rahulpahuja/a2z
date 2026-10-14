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
