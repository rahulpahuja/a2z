import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <>
      <header className="w-full px-margin-desktop py-4 bg-surface border-b border-surface-variant flex justify-between items-center max-w-container-max mx-auto">
        <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
          A2Z Collection
        </Link>
        <Link to="/" className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors">
          Back to Home
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-8">
          Privacy Policy
        </h1>

        <div className="font-body-lg text-body-lg text-on-surface-variant space-y-8">
          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Information We Collect</h2>
            <p>
              We collect the information you provide directly to us, such as your name, shipping address, phone
              number, and pincode, in order to process and deliver your orders.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Product Availability</h2>
            <p>
              All products listed on A2Z Collection are subject to availability. We reserve the right to limit,
              cancel, or refuse any order if an item is out of stock or unavailable at the time of fulfillment.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Delivery &amp; Shipping Disclaimer</h2>
            <p>
              Delivery of all products is carried out by our third-party delivery partners. While we make every
              effort to ensure timely dispatch, the final delivery timeline is subject to the delivery partner's
              own operations, logistics, and serviceability of your area.
            </p>
            <p className="mt-4">
              A2Z Collection is not responsible for any delay in delivery caused by our delivery partner,
              including but not limited to delays due to weather, transit disruptions, incorrect address details,
              or courier-side operational issues. In no case shall A2Z Collection be held liable for the
              delivery of a product once it has been handed over to the delivery partner.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">How We Use Your Information</h2>
            <p>
              Your information is used solely to process orders, coordinate delivery, and communicate updates
              about your purchase. We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please reach out to us through the contact
              options available on our website.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
