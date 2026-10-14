// Minimal CSV serialiser for admin exports (no dependency).
//
// Output follows RFC 4180: CRLF record separators, fields containing a comma,
// double quote, CR or LF are wrapped in double quotes with embedded quotes
// doubled. A UTF-8 BOM is prefixed so Excel opens ₹ / Devanagari text
// correctly instead of guessing a legacy code page.
//
// Formula-injection rule (OWASP "CSV Injection"): spreadsheet apps evaluate a
// cell whose text starts with = + - @ TAB or CR. Any such *string* cell gets a
// single quote prepended, which spreadsheets treat as "this is text" (the
// quote is not shown). Exceptions, so legitimate data isn't mangled:
//   - real JavaScript numbers are never prefixed (a negative number is data);
//   - in a column declared `numeric: true`, a string that is entirely a plain
//     decimal number ("-12.50", "+5") is also left alone. Anything else in a
//     numeric column (e.g. "-1+1", "=SUM(A1)") is still neutralised.
// Everything else — including phone numbers typed as "+91…" in a text column —
// is prefixed; that is the intended, safe behaviour.

const BOM = '﻿';
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
const PLAIN_DECIMAL = /^[-+]?\d+(\.\d+)?$/;
const NEEDS_QUOTING = /[",\r\n]/;

function stringify(value) {
  if (value === null || value === undefined) return { text: '', isNumber: false };
  if (typeof value === 'number') {
    return Number.isFinite(value) ? { text: String(value), isNumber: true } : { text: '', isNumber: false };
  }
  if (typeof value === 'boolean') return { text: String(value), isNumber: false };
  if (value instanceof Date) {
    return { text: Number.isNaN(value.getTime()) ? '' : value.toISOString(), isNumber: false };
  }
  if (typeof value === 'object') return { text: JSON.stringify(value), isNumber: false };
  return { text: String(value), isNumber: false };
}

/** Serialises one cell: injection-neutralised, then RFC 4180-quoted. */
export function escapeCsvCell(value, { numeric = false } = {}) {
  const { text, isNumber } = stringify(value);
  let safe = text;
  if (!isNumber && FORMULA_TRIGGER.test(text) && !(numeric && PLAIN_DECIMAL.test(text))) {
    safe = `'${text}`;
  }
  return NEEDS_QUOTING.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * @param {object[]} rows
 * @param {{ header: string, key?: string, value?: (row: object) => unknown, numeric?: boolean }[]} columns
 *   Each column reads `row[key]`, or `value(row)` when given.
 * @returns {string} CSV text prefixed with a UTF-8 BOM.
 */
export function toCsv(rows, columns) {
  const headerLine = columns.map((col) => escapeCsvCell(col.header)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((col) => escapeCsvCell(col.value ? col.value(row) : row?.[col.key], { numeric: col.numeric }))
      .join(',')
  );
  return BOM + [headerLine, ...lines].join('\r\n');
}
