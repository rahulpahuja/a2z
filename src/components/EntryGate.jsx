import { useState } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'a2z_entry_gate';
const UNGATED_PATHS = ['/privacy-policy'];
const UNGATED_PREFIXES = ['/super', '/dashboard'];

function readStoredGate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function EntryGate({ children }) {
  const location = useLocation();
  const [accepted, setAccepted] = useState(() => !!readStoredGate()?.accepted);
  const [pincode, setPincode] = useState('');
  const [policyChecked, setPolicyChecked] = useState(false);
  const [touched, setTouched] = useState(false);

  if (
    accepted ||
    UNGATED_PATHS.includes(location.pathname) ||
    UNGATED_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))
  ) {
    return children;
  }

  const pincodeValid = /^[1-9][0-9]{5}$/.test(pincode);
  const canContinue = pincodeValid && policyChecked;

  const handleSubmit = (event) => {
    event.preventDefault();
    setTouched(true);
    if (!canContinue) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: true, pincode }));
    setAccepted(true);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-on-surface/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl p-8">
        <h1 className="font-headline-md text-headline-md text-primary playfair mb-2">A2Z Collection</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
          Enter your delivery pincode to continue shopping.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="entry-pincode">
              Delivery Pincode
            </label>
            <input
              id="entry-pincode"
              inputMode="numeric"
              maxLength={6}
              placeholder="e.g. 400050"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
            />
            {touched && !pincodeValid && (
              <p className="font-body-sm text-body-sm text-error mt-2">Enter a valid 6-digit pincode.</p>
            )}
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={policyChecked}
              onChange={(e) => setPolicyChecked(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-outline text-primary focus:ring-primary"
            />
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              I have read and accept the{' '}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Privacy Policy
              </a>
              , including the delivery and product availability terms.
            </span>
          </label>
          {touched && !canContinue && pincodeValid && (
            <p className="font-body-sm text-body-sm text-error -mt-2">Please accept the Privacy Policy to continue.</p>
          )}
          <button
            type="submit"
            className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-4 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Continue Shopping
          </button>
        </form>
      </div>
    </div>
  );
}
