// Specification rows the admin fills in per product. A row is only returned when the
// product actually has a value, so the storefront never states Care or Origin
// details nobody entered.
const OPTIONAL_SPECS = [
  { label: 'Care', field: 'care' },
  { label: 'Origin', field: 'origin' },
];

export function getOptionalSpecs(product) {
  return OPTIONAL_SPECS.flatMap(({ label, field }) => {
    const value = typeof product?.[field] === 'string' ? product[field].trim() : '';
    return value ? [{ label, value }] : [];
  });
}
