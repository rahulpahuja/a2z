import { useEffect, useState } from 'react';
import { getDiscountCountdownMs } from '../utils/discount.js';

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// A live "Ends in mm:ss" countdown, shown only once a dated discount enters
// its final hour (see getDiscountCountdownMs) — ticks every second and
// renders nothing once the discount's end instant passes, at which point
// getPriceBreakdown's own real-time check reverts the price on its own.
// `onExpire` lets the caller (which may be mid-render with a stale price
// computed before the deadline) force a re-render to pick that reversion up.
export default function DiscountCountdown({ product, className = '', onExpire }) {
  const [msRemaining, setMsRemaining] = useState(() => getDiscountCountdownMs(product));

  useEffect(() => {
    setMsRemaining(getDiscountCountdownMs(product));
    const interval = setInterval(() => {
      const next = getDiscountCountdownMs(product);
      setMsRemaining((prev) => {
        if (prev !== null && next === null) onExpire?.();
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.discountValue, product?.discountUnit, product?.discountDurationType, product?.discountEndDate]);

  if (msRemaining === null) return null;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="material-symbols-outlined text-[0.875rem] leading-none">schedule</span>
      Ends in {formatCountdown(msRemaining)}
    </span>
  );
}
