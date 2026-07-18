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
            <h2 className="font-title-sm text-title-sm text-error mb-3">Returns</h2>
            <p>
              Due to the delicate handcrafted nature of our products, <strong className="text-on-surface font-semibold">NO RETURNS</strong> are
              accepted unless the product is defective or damaged upon arrival. If you receive a defective item,
              contact us within 48 hours of delivery with photos of the issue and we will arrange a replacement or
              refund.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Exchanges</h2>
            <p>
              Size exchanges are permitted within 7 days of delivery, subject to inventory availability. The item
              must be unworn, unwashed, and returned with its original tags attached.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">How to Request an Exchange or Report a Defect</h2>
            <p>
              <Link to="/contact-us" className="text-primary hover:underline">Contact us</Link> with your order ID,
              the item you'd like to exchange or report, and clear photos where applicable. We'll guide you
              through the next steps.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
