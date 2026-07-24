import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter.jsx';
import { subscribeToStoreSettings, DEFAULT_REFUND_POLICY } from '../services/storeSettings.js';

export default function RefundPolicyPage() {
  const [refundPolicy, setRefundPolicy] = useState(DEFAULT_REFUND_POLICY);

  useEffect(() => {
    const unsubscribe = subscribeToStoreSettings((settings) => {
      if (settings && settings.refundPolicy) {
        setRefundPolicy(settings.refundPolicy);
      } else {
        setRefundPolicy(DEFAULT_REFUND_POLICY);
      }
    });
    return unsubscribe;
  }, []);

  // Format policy into structured sections by splitting on double newlines
  const sections = refundPolicy
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length > 1 && !lines[0].includes('.')) {
        return { title: lines[0], content: lines.slice(1).join(' ') };
      }
      return { title: null, content: block };
    });

  return (
    <>
      <header className="w-full px-margin-mobile md:px-margin-desktop py-4 bg-surface border-b border-surface-variant flex justify-between items-center max-w-container-max mx-auto">
        <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
          A2Z Collection
        </Link>
        <Link to="/" className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors">
          Back to Home
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <div className="mb-8">
          <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest">Store Policy</span>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mt-2 mb-4">
            Refund &amp; Return Policy
          </h1>
        </div>

        {/* Highlight Banner */}
        <div className="bg-error-container/20 border border-error/30 rounded-xl p-5 md:p-6 mb-10 flex items-start gap-4">
          <span className="material-symbols-outlined text-error text-2xl shrink-0 mt-0.5">verified</span>
          <div>
            <h2 className="font-title-sm text-title-sm text-on-surface font-semibold mb-1">
              Quality Assurance • No Returns &amp; No Exchanges Policy
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Our policy is that we sell quality products and we believe in no returns and no exchanges under any circumstances — even if you receive a faulty product.
            </p>
          </div>
        </div>

        <div className="font-body-lg text-body-lg text-on-surface-variant space-y-8">
          {sections.map((sec, idx) => (
            <section key={idx} className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6">
              {sec.title && (
                <h2 className="font-title-sm text-title-sm text-on-surface font-semibold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">info</span>
                  {sec.title}
                </h2>
              )}
              <p className="leading-relaxed whitespace-pre-line text-on-surface-variant">
                {sec.content}
              </p>
            </section>
          ))}

          <section className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-6">
            <h2 className="font-title-sm text-title-sm text-on-surface mb-2 font-semibold">Have Questions?</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              If you have any questions or need assistance regarding your shipment, feel free to reach out to us via our{' '}
              <Link to="/contact-us" className="text-primary hover:underline font-medium">Contact Us</Link> page.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
