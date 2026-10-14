import { describe, it, expect } from 'vitest';
import { toCsv, escapeCsvCell } from './csv.js';

const BOM = '﻿';
const cols = [
  { header: 'a', key: 'a' },
  { header: 'b', key: 'b' },
];

describe('toCsv structure', () => {
  it('prefixes a UTF-8 BOM and joins records with CRLF', () => {
    const out = toCsv([{ a: 1, b: 'x' }, { a: 2, b: 'y' }], cols);
    expect(out).toBe(`${BOM}a,b\r\n1,x\r\n2,y`);
  });

  it('emits only the header for no rows', () => {
    expect(toCsv([], cols)).toBe(`${BOM}a,b`);
  });

  it('supports value accessors as well as keys', () => {
    const out = toCsv([{ n: { first: 'A', last: 'B' } }], [{ header: 'name', value: (r) => `${r.n.first} ${r.n.last}` }]);
    expect(out).toBe(`${BOM}name\r\nA B`);
  });
});

describe('RFC 4180 quoting', () => {
  it('quotes fields containing commas', () => {
    expect(escapeCsvCell('Kurti, blue')).toBe('"Kurti, blue"');
  });

  it('doubles embedded quotes', () => {
    expect(escapeCsvCell('5" heel')).toBe('"5"" heel"');
  });

  it('quotes fields containing LF, CR and CRLF', () => {
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCsvCell('a\r\nb')).toBe('"a\r\nb"');
    expect(escapeCsvCell('a\rb')).toBe('"a\rb"');
  });

  it('does not quote plain fields', () => {
    expect(escapeCsvCell('plain text')).toBe('plain text');
  });

  it('quotes the header cells too', () => {
    expect(toCsv([], [{ header: 'Total, INR', key: 'x' }])).toBe(`${BOM}"Total, INR"`);
  });

  it('keeps a multi-line cell inside a single record', () => {
    const out = toCsv([{ a: 'x\ny', b: 'z' }], cols);
    expect(out).toBe(`${BOM}a,b\r\n"x\ny",z`);
  });
});

describe('null, undefined and primitive handling', () => {
  it('renders null/undefined as empty and missing keys as empty', () => {
    expect(toCsv([{ a: null }, { b: undefined }, {}], cols)).toBe(`${BOM}a,b\r\n,\r\n,\r\n,`);
  });

  it('renders numbers raw, including 0, decimals and negatives', () => {
    expect(toCsv([{ a: 0, b: 1299.5 }, { a: -250, b: 1e21 }], cols)).toBe(`${BOM}a,b\r\n0,1299.5\r\n-250,1e+21`);
  });

  it('renders NaN and Infinity as empty', () => {
    expect(toCsv([{ a: NaN, b: Infinity }], cols)).toBe(`${BOM}a,b\r\n,`);
  });

  it('renders booleans, dates and objects predictably', () => {
    expect(escapeCsvCell(true)).toBe('true');
    expect(escapeCsvCell(new Date('2026-03-04T05:06:07.000Z'))).toBe('2026-03-04T05:06:07.000Z');
    expect(escapeCsvCell(new Date('nope'))).toBe('');
    expect(escapeCsvCell({ k: 1 })).toBe('"{""k"":1}"');
  });
});

describe('unicode', () => {
  it('passes rupee signs and Devanagari through untouched', () => {
    expect(toCsv([{ a: '₹1,299', b: 'राहुल पहुजा' }], cols)).toBe(`${BOM}a,b\r\n"₹1,299",राहुल पहुजा`);
  });
});

describe('formula-injection neutralisation', () => {
  it.each(['=1+1', '+1+1', '-1+1', '@SUM(A1)', '\tcmd', '\rcmd'])('prefixes a quote to %j', (payload) => {
    const cell = escapeCsvCell(payload);
    // A leading CR also forces quoting; strip the quotes to inspect the content.
    const unquoted = cell.startsWith('"') ? cell.slice(1, -1) : cell;
    expect(unquoted.startsWith("'")).toBe(true);
    expect(unquoted.slice(1)).toBe(payload);
  });

  it('neutralises the classic DDE payload and keeps it quoted as needed', () => {
    expect(escapeCsvCell('=cmd|\' /C calc\'!A0')).toBe("'=cmd|' /C calc'!A0");
    expect(escapeCsvCell('=HYPERLINK("http://evil","x")')).toBe('"\'=HYPERLINK(""http://evil"",""x"")"');
  });

  it('only checks the first character', () => {
    expect(escapeCsvCell('a=b')).toBe('a=b');
    expect(escapeCsvCell('Kurti - blue')).toBe('Kurti - blue');
    expect(escapeCsvCell('x@y.com')).toBe('x@y.com');
  });

  it('does not touch real negative/positive numbers', () => {
    expect(escapeCsvCell(-250.5)).toBe('-250.5');
    expect(escapeCsvCell(0)).toBe('0');
  });

  it('prefixes numeric-looking strings in text columns', () => {
    expect(escapeCsvCell('-250')).toBe("'-250");
    expect(escapeCsvCell('+919876543210')).toBe("'+919876543210");
  });

  it('leaves plain decimal strings alone in numeric columns', () => {
    expect(escapeCsvCell('-250', { numeric: true })).toBe('-250');
    expect(escapeCsvCell('+5.25', { numeric: true })).toBe('+5.25');
  });

  it('still neutralises non-numeric payloads in numeric columns', () => {
    expect(escapeCsvCell('-1+1', { numeric: true })).toBe("'-1+1");
    expect(escapeCsvCell('=SUM(A1)', { numeric: true })).toBe("'=SUM(A1)");
    expect(escapeCsvCell('-1e3', { numeric: true })).toBe("'-1e3");
    expect(escapeCsvCell('-5.', { numeric: true })).toBe("'-5.");
  });

  it('applies to header cells', () => {
    expect(toCsv([], [{ header: '=evil', key: 'x' }])).toBe(`${BOM}'=evil`);
  });

  it('applies numeric exemption through toCsv columns', () => {
    const out = toCsv([{ a: '-12.50', b: '-12.50' }], [
      { header: 'a', key: 'a', numeric: true },
      { header: 'b', key: 'b' },
    ]);
    expect(out).toBe(`${BOM}a,b\r\n-12.50,'-12.50`);
  });
});
