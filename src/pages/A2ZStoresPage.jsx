import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter.jsx';

export default function A2ZStoresPage() {
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

      <main className="max-w-2xl mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16 text-center">
        <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest">Our Locations</span>
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mt-3 mb-6 playfair">
          A2Z Stores
        </h1>

        <div className="bg-surface-container-low border border-tertiary-container/30 rounded-xl p-8 flex flex-col items-center gap-3">
          <span className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">storefront</span>
          </span>
          <p className="font-title-sm text-title-sm text-on-surface">
            We currently have just one home — right here in Jaipur.
          </p>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md">
            A2Z Collection does not have any other stores, branches, or franchise partners at this time. Every
            order ships directly from our Jaipur studio, and this website is the only official place to shop with
            us.
          </p>
          <p className="font-body-sm text-body-sm text-on-surface mt-2">
            A2Z Collection Studio, Bapu Bazaar Road,
            <br />
            Jaipur, Rajasthan 302003, India
          </p>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant mt-6">
          Beware of anyone claiming to run an "A2Z Collection" store, kiosk, or franchise elsewhere — if in doubt,{' '}
          <Link to="/contact-us" className="text-primary hover:underline">contact us</Link> directly to confirm.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
