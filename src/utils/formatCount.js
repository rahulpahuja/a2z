// 999 -> "999", 1200 -> "1.2K", 15300 -> "15K", 2400000 -> "2.4M". Never shows a trailing ".0".
export function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '0';
  const whole = Math.floor(n);
  const scale = (divisor, suffix) => {
    const scaled = whole / divisor;
    // Truncate rather than round, so 9,999 reads "9.9K" and never "10K" before it is 10,000.
    const text = scaled < 10 ? String(Math.floor(scaled * 10) / 10) : String(Math.floor(scaled));
    return `${text}${suffix}`;
  };
  if (whole < 1000) return String(whole);
  if (whole < 1_000_000) return scale(1000, 'K');
  return scale(1_000_000, 'M');
}
