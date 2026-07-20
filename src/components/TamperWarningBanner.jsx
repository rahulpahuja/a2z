import { useEffect, useState } from 'react';
import { isLikelyDevtoolsOpen, isEmbeddedInIframe } from '../utils/tamperDetection.js';

// Weak, best-effort heuristics only — see tamperDetection.js. This banner is
// a deterrent, not a security boundary; dismissing it enforces nothing.
export default function TamperWarningBanner() {
  const [reason, setReason] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isEmbeddedInIframe()) {
      setReason('framed');
      return;
    }
    const check = () => {
      if (isLikelyDevtoolsOpen()) {
        setReason('devtools');
      }
    };
    check();
    const interval = setInterval(check, 1500);
    return () => clearInterval(interval);
  }, []);

  if (!reason || dismissed) return null;

  const message =
    reason === 'framed'
      ? "This page is being displayed inside another site's frame. If you didn't expect that, close this tab."
      : 'Developer tools appear to be open. Avoid pasting untrusted code here or sharing what you see on this page with anyone.';

  return (
    <div className="fixed top-0 inset-x-0 z-[300] bg-tertiary text-on-tertiary text-center text-[12px] font-body-sm px-4 py-2 flex items-center justify-center gap-3">
      <span>{message}</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="underline underline-offset-2 font-semibold shrink-0"
      >
        Dismiss
      </button>
    </div>
  );
}
