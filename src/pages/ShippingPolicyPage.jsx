import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter.jsx';

export default function ShippingPolicyPage() {
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
          Shipping Policy
        </h1>

        <div className="font-body-lg text-body-lg text-on-surface-variant space-y-8">
          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Free Standard Shipping</h2>
            <p>
              We offer free standard shipping on all orders above ₹2,000. Orders below this amount may incur a
              flat shipping fee shown at checkout.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Delivery Timelines</h2>
            <p>
              Most orders are delivered within 3 to 7 business days, depending on your location and the delivery
              partner serving your area. Express delivery options are available at checkout for an additional fee.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Packaging</h2>
            <p>
              Every item is carefully packaged in our signature artisan boxes to ensure it arrives in perfect
              condition.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Delivery Partner Disclaimer</h2>
            <p>
              Delivery of all products is carried out by our third-party delivery partners. While we make every
              effort to ensure timely dispatch, the final delivery timeline is subject to the delivery partner's
              own operations, logistics, and serviceability of your area. A2Z Collection is not responsible for
              delays caused by weather, transit disruptions, incorrect address details, or courier-side issues.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Tracking Your Order</h2>
            <p>
              Once your order ships, you can track it anytime from the{' '}
              <Link to="/orders/tracking" className="text-primary hover:underline">Order Tracking</Link> page.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
