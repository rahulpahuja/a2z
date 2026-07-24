import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter.jsx';

export default function ReturnExchangePolicyPage() {
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
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-8">
          Return and Exchange Policy
        </h1>

        <div className="font-body-lg text-body-lg text-on-surface-variant space-y-8">
          <section>
            <h2 className="font-title-sm text-title-sm text-error mb-3 font-semibold">No Returns &amp; No Exchanges</h2>
            <p>
              Our policy is that we sell quality products and we believe in no returns and no exchanges. There are strictly no returns or exchanges accepted under any circumstances. Even if you receive a faulty or defective product, there is no exchange for that.
            </p>
            <p className="mt-3">
              For complete details regarding cancellations, delivery reattempts, undelivered parcels, and resend charges, please refer to our{' '}
              <Link to="/refund-policy" className="text-primary hover:underline font-medium">Refund Policy</Link>.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
