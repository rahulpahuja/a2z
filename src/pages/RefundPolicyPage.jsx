import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter.jsx';

export default function RefundPolicyPage() {
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
          Refund Policy
        </h1>

        <div className="font-body-lg text-body-lg text-on-surface-variant space-y-8">
          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">When Refunds Apply</h2>
            <p>
              Refunds are issued only for items that arrive defective or damaged, in line with our{' '}
              <Link to="/return-exchange-policy" className="text-primary hover:underline">Return and Exchange
              Policy</Link>. We do not offer refunds for change of mind, sizing issues, or preference — size
              exchanges are available instead within 7 days of delivery.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Processing Time</h2>
            <p>
              Once a defective item is received and inspected, eligible refunds are processed within 5-7 business
              days back to your original payment method. Cash on Delivery orders are refunded via bank transfer or
              UPI.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">How to Request a Refund</h2>
            <p>
              <Link to="/contact-us" className="text-primary hover:underline">Contact us</Link> within 48 hours of
              delivery with your order ID and photos of the defect. Our team will confirm eligibility and start
              the refund process.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
