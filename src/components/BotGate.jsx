import { useEffect, useState } from 'react';
import { getBotVerdict } from '../utils/botDetection.js';

export default function BotGate({ children }) {
  const [verdict, setVerdict] = useState(null);

  useEffect(() => {
    setVerdict(getBotVerdict());
  }, []);

  if (verdict === null) return null;

  if (verdict.blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <h1 className="font-headline-md text-headline-md text-on-surface mb-3">Access Restricted</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Automated access to this site is not permitted. If you believe this is a mistake, please contact us
            directly.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
