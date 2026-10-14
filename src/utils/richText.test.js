import { describe, it, expect } from 'vitest';
import { parseDescription, descriptionToPlain } from './richText.js';

describe('parseDescription', () => {
  it('returns no blocks for empty, whitespace-only and non-string input', () => {
    expect(parseDescription('')).toEqual([]);
    expect(parseDescription('  \n \n  ')).toEqual([]);
    expect(parseDescription(undefined)).toEqual([]);
    expect(parseDescription(null)).toEqual([]);
    expect(parseDescription(42)).toEqual([]);
  });

  it('keeps a legacy single-string description as one paragraph', () => {
    expect(parseDescription('A soft cotton kurti set.')).toEqual([
      { type: 'paragraph', text: 'A soft cotton kurti set.' },
    ]);
  });

  it('splits paragraphs on blank lines, including whitespace-only separator lines', () => {
    expect(parseDescription('First.\n\nSecond.\n  \nThird.')).toEqual([
      { type: 'paragraph', text: 'First.' },
      { type: 'paragraph', text: 'Second.' },
      { type: 'paragraph', text: 'Third.' },
    ]);
  });

  it('normalises CRLF and lone CR line endings', () => {
    expect(parseDescription('One.\r\n\r\nTwo.\rThree.')).toEqual([
      { type: 'paragraph', text: 'One.' },
      { type: 'paragraph', text: 'Two.\nThree.' },
    ]);
  });

  it('turns "- " and "• " lines into a bullet list', () => {
    expect(parseDescription('Details\n- Soft cotton\n• Machine embroidery\n-   Relaxed fit')).toEqual([
      { type: 'paragraph', text: 'Details' },
      { type: 'list', items: ['Soft cotton', 'Machine embroidery', 'Relaxed fit'] },
    ]);
  });

  it('does not treat hyphenated words or a bare dash as bullets', () => {
    expect(parseDescription('-5% off\nwell-made')).toEqual([{ type: 'paragraph', text: '-5% off\nwell-made' }]);
    expect(parseDescription('-')).toEqual([{ type: 'paragraph', text: '-' }]);
  });

  it('keeps labelled runs as plain lines', () => {
    expect(parseDescription('Colour & Fabric: Navy cotton\nDesign: Floral')).toEqual([
      { type: 'paragraph', text: 'Colour & Fabric: Navy cotton\nDesign: Floral' },
    ]);
  });

  it('collapses runs of spaces inside a line', () => {
    expect(parseDescription('Soft    cotton\t kurti')).toEqual([{ type: 'paragraph', text: 'Soft cotton kurti' }]);
  });

  it('treats HTML as inert text', () => {
    const [block] = parseDescription('<script>alert(1)</script> <b>bold</b>');
    expect(block).toEqual({ type: 'paragraph', text: '<script>alert(1)</script> <b>bold</b>' });
  });
});

describe('descriptionToPlain', () => {
  it('returns an empty string for missing input', () => {
    expect(descriptionToPlain(undefined)).toBe('');
    expect(descriptionToPlain('  \n ')).toBe('');
  });

  it('leaves a legacy single-line description unchanged', () => {
    expect(descriptionToPlain('A soft cotton kurti set.')).toBe('A soft cotton kurti set.');
    expect(descriptionToPlain('No full stop')).toBe('No full stop');
  });

  it('flattens newlines and bullets without leaking markers', () => {
    const plain = descriptionToPlain('Festive kurti\r\n\r\n- Soft cotton\n• Relaxed fit');
    expect(plain).toBe('Festive kurti. Soft cotton. Relaxed fit');
    expect(plain).not.toMatch(/[\n•]|- /);
  });

  it('does not double existing punctuation', () => {
    expect(descriptionToPlain('One.\n\nTwo!\n\nThree')).toBe('One. Two! Three');
  });
});
