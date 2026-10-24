// Display helpers for the Realtime Database usage card. Sizes are decimal megabytes (1 MB = 1,000,000 bytes),
// matching how the 1 GB plan limit is quoted.
export const BYTES_PER_MB = 1_000_000;

export const toMb = (bytes) => (Number.isFinite(bytes) && bytes > 0 ? bytes / BYTES_PER_MB : 0);

// "12.34 MB"; sizes under 0.01 MB show as "< 0.01 MB" so a small node never reads as empty.
export function formatMb(bytes) {
  const mb = toMb(bytes);
  if (mb === 0) return '0 MB';
  return mb < 0.01 ? '< 0.01 MB' : `${mb.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MB`;
}

export const usedPercent = (usedBytes, limitBytes) =>
  limitBytes > 0 ? Math.min(100, Math.max(0, (usedBytes / limitBytes) * 100)) : 0;

// 'ok' under 70%, 'warn' from 70%, 'critical' from 90%.
export function usageLevel(percent) {
  if (percent >= 90) return 'critical';
  return percent >= 70 ? 'warn' : 'ok';
}
