import { useState } from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter.jsx';

// Exact coordinates for A to Z Collection, 111 Main Road, near J K Mobiles, Sindhi Colony, Indore.
const STORE_LAT = 22.7001897;
const STORE_LON = 75.863683;
const MAP_BBOX = '75.853683,22.6901897,75.873683,22.7101897';
const OSM_EMBED_URL = `https://www.openstreetmap.org/export/embed.html?bbox=${MAP_BBOX}&layer=mapnik&marker=${STORE_LAT}%2C${STORE_LON}`;
const GOOGLE_DIRECTIONS_URL =
  'https://www.google.com/maps/dir//A+to+Z+Collection,+111,+Main+Road,+near+J+K+Mobiles,+Sindhi+Colony,+Indore,+Madhya+Pradesh+452001/@22.7124622,75.8650143,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3962fd3a23e5d5eb:0x1f393b2feaed140b!2m2!1d75.863683!2d22.7001897';

export default function A2ZStoresPage() {
  const [showMap, setShowMap] = useState(false);

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
            We currently have just one home — right here in Indore.
          </p>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md">
            A2Z Collection does not have any other stores, branches, or franchise partners at this time. Every
            order ships directly from our Indore studio, and this website is the only official place to shop with
            us.
          </p>
          <p className="font-body-sm text-body-sm text-on-surface mt-2">
            A to Z Collection, 111, Main Road, near J K Mobiles,
            <br />
            Sindhi Colony, Indore, Madhya Pradesh 452001
          </p>

          {!showMap ? (
            <button
              type="button"
              onClick={() => setShowMap(true)}
              className="mt-2 inline-flex items-center gap-2 bg-primary text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-xl uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[18px]">map</span>
              View on Map
            </button>
          ) : (
            <div className="w-full mt-2 flex flex-col gap-2">
              <div className="w-full rounded-xl overflow-hidden border border-outline-variant/30">
                <iframe
                  title="A2Z Collection Studio location on OpenStreetMap"
                  src={OSM_EMBED_URL}
                  className="w-full h-[320px]"
                  style={{ border: 0 }}
                  loading="lazy"
                />
              </div>
              <a
                href={GOOGLE_DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body-sm text-body-sm text-primary hover:underline self-center"
              >
                Get Directions ↗
              </a>
            </div>
          )}
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant mt-6">
          This is the only A2Z Collection store — we have no other branches, kiosks, or franchise locations.
          Beware of anyone claiming to run an "A2Z Collection" store elsewhere — if in doubt,{' '}
          <Link to="/contact-us" className="text-primary hover:underline">contact us</Link> directly to confirm.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
