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
        <div className="mb-8">
          <span className="font-label-caps text-label-caps text-error uppercase tracking-widest font-semibold">Store Policy</span>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mt-2 mb-4">
            Return and Exchange Policy
          </h1>
        </div>

        {/* Highlight Banner */}
        <div className="bg-error-container/20 border border-error/30 rounded-xl p-5 md:p-6 mb-10 flex items-start gap-4">
          <span className="material-symbols-outlined text-error text-2xl shrink-0 mt-0.5">block</span>
          <div>
            <h2 className="font-title-sm text-title-sm text-on-surface font-semibold mb-1">
              Quality Assurance • No Returns &amp; No Exchanges Policy
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Our policy is that we sell quality products and we believe in no returns and no exchanges. There are strictly no returns or exchanges accepted — even if you receive a faulty product, there is no exchange for that.
            </p>
          </div>
        </div>

        <div className="font-body-lg text-body-lg text-on-surface-variant space-y-8">
          <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6">
            <h2 className="font-title-sm text-title-sm text-on-surface font-semibold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-xl">block</span>
              No Returns &amp; No Exchanges
            </h2>
            <p className="leading-relaxed">
              Our policy is that we sell quality products and we believe in no returns and no exchanges. There are strictly no returns or exchanges accepted under any circumstances. If you receive a faulty or defective product, there is no exchange or return for that.
            </p>
          </section>

          <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6">
            <h2 className="font-title-sm text-title-sm text-on-surface font-semibold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">cancel</span>
              No Order Cancellation
            </h2>
            <p className="leading-relaxed">
              First of all, there is no provision for order cancellation once an order has been placed.
            </p>
          </section>

          <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6">
            <h2 className="font-title-sm text-title-sm text-on-surface font-semibold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">local_shipping</span>
              Delivery &amp; Courier Reattempts
            </h2>
            <p className="leading-relaxed">
              If at all, by any chance you are missing the delivery, reattempts will be made by our courier partner. If in case you are unable to receive that courier, you can arrange to have it received at your neighbor's house or by somebody who is near you.
            </p>
          </section>

          <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6">
            <h2 className="font-title-sm text-title-sm text-on-surface font-semibold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">keyboard_return</span>
              Undelivered Parcels &amp; Resend Charges
            </h2>
            <p className="leading-relaxed">
              If at all you fail to get the delivery done, the parcel will be returned to A to Z Collection. You can request for a resend. We will resend you the parcel, but the charges for that will be borne by you. A to Z Collection is not liable for you not receiving the order.
            </p>
          </section>

          <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6">
            <h2 className="font-title-sm text-title-sm text-on-surface font-semibold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">payments</span>
              Non-Refundable Policy
            </h2>
            <p className="leading-relaxed">
              If in case you still fail to receive the order, the money won't be returned because there is no returns or exchange policy.
            </p>
          </section>

          <section className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-6">
            <h2 className="font-title-sm text-title-sm text-on-surface mb-2 font-semibold">Need Further Clarification?</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Please refer to our full <Link to="/refund-policy" className="text-primary hover:underline font-medium">Refund Policy</Link> page or <Link to="/contact-us" className="text-primary hover:underline font-medium">Contact Us</Link> if you have questions regarding your order status.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
