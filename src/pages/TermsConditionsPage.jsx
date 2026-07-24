import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter.jsx';

export default function TermsConditionsPage() {
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
          Terms &amp; Conditions
        </h1>

        <div className="font-body-lg text-body-lg text-on-surface-variant space-y-8">
          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Using This Website</h2>
            <p>
              By browsing or placing an order on A2Z Collection, you agree to these terms. If you do not agree,
              please do not use this website.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Product Availability &amp; Pricing</h2>
            <p>
              All products listed are subject to availability. We reserve the right to limit, cancel, or refuse
              any order if an item is out of stock or unavailable at the time of fulfillment. Prices are subject
              to change without notice, but any change will not affect orders already confirmed.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Orders &amp; Payment</h2>
            <p>
              Placing an order is an offer to purchase, which we may accept or decline. Payment must be completed
              through one of our supported methods before an order is confirmed and dispatched, except where Cash
              on Delivery is available.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Returns, Exchanges &amp; Shipping</h2>
            <p>
              Our{' '}
              <Link to="/return-exchange-policy" className="text-primary hover:underline">Return and Exchange
              Policy</Link>,{' '}
              <Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link>, and{' '}
              <Link to="/shipping-policy" className="text-primary hover:underline">Shipping Policy</Link> form
              part of these Terms &amp; Conditions.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Intellectual Property</h2>
            <p>
              All product listings, images, descriptions, pricing, and site design are the property of A2Z
              Collection and may not be reproduced without our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Prohibited Automated Access</h2>
            <p>
              You may not use any bot, crawler, scraper, scanner, or AI-based tool or agent to access, extract,
              copy, or create a modified or derivative reproduction of any content on this website without our
              prior written consent. Anyone found engaging in such unauthorized automated access or reproduction
              will be subject to heavy penalization, to the fullest extent permitted by law.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Changes to These Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the website after changes are posted
              constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="font-title-sm text-title-sm text-on-surface mb-3">Contact</h2>
            <p>
              Questions about these terms? <Link to="/contact-us" className="text-primary hover:underline">Contact
              us</Link> — we're happy to help.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
