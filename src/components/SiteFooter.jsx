import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { INSTAGRAM_HANDLE } from '../config/store.js';
import { APP_VERSION, APP_BUILD } from '../constants/version.js';
import { subscribeToStoreSettings, DEFAULT_STORE_SETTINGS } from '../services/storeSettings.js';

const LINK_CLASS =
  'font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:underline transition-all focus:ring-2 focus:ring-primary-container outline-none rounded-sm w-fit';

const ABOUT_LINKS = [
  { label: 'About Us', to: '/about-us' },
  { label: 'Contact Us', to: '/contact-us' },
  { label: 'Store Appointment', to: '/store-appointment' },
  { label: 'A2Z Stores', to: '/a2z-stores' },
  { label: 'Careers', to: '/careers' },
  { label: 'Feedback', to: '/feedback' },
];

const POLICY_LINKS = [
  { label: 'Terms & Conditions', to: null },
  { label: 'Shipping Policy', to: null },
  { label: 'Return and Exchange Policy', to: null },
  { label: 'Refund Policy', to: null },
  { label: 'Size Chart', to: '/size-chart' },
  { label: 'FAQs', to: '/faqs' },
];

function FooterColumn({ title, children }) {
  return (
    <div className="flex flex-col gap-3">
      <h4 className="font-label-caps text-label-caps text-on-surface font-bold mb-1">{title}</h4>
      {children}
    </div>
  );
}

export default function SiteFooter() {
  const [facebookUrl, setFacebookUrl] = useState(DEFAULT_STORE_SETTINGS.facebookUrl);

  useEffect(() => {
    const unsubscribe = subscribeToStoreSettings((settings) => {
      if (settings.facebookUrl) setFacebookUrl(settings.facebookUrl);
    });
    return unsubscribe;
  }, []);

  return (
    <footer className="bg-surface-container-low dark:bg-surface-container-lowest full-width bottom mt-auto border-t border-surface-variant">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-gutter px-margin-mobile md:px-margin-desktop py-12 max-w-container-max mx-auto">
        <FooterColumn title="About A2Z">
          {ABOUT_LINKS.map((link) =>
            link.to ? (
              <Link key={link.label} className={LINK_CLASS} to={link.to}>
                {link.label}
              </Link>
            ) : (
              <a key={link.label} className={LINK_CLASS} href="#">
                {link.label}
              </a>
            )
          )}
        </FooterColumn>

        <FooterColumn title="Policies">
          {POLICY_LINKS.map((link) =>
            link.to ? (
              <Link key={link.label} className={LINK_CLASS} to={link.to}>
                {link.label}
              </Link>
            ) : (
              <a key={link.label} className={LINK_CLASS} href="#">
                {link.label}
              </a>
            )
          )}
          <Link className={LINK_CLASS} to="/privacy-policy">
            Privacy Policy
          </Link>
        </FooterColumn>

        <FooterColumn title="Subscribe Now!">
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
            Stay in style with A2Z Collection. Get early access to exclusive launches, bespoke offers, style
            inspiration, and fashion tips straight to your inbox.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex gap-2 mt-1"
          >
            <input
              type="email"
              required
              placeholder="Email"
              aria-label="Email"
              className="flex-1 min-w-0 bg-surface border-b border-tertiary-container focus:border-primary focus:ring-0 focus:outline-none py-2 px-0 font-body-sm text-body-sm bg-transparent transition-colors"
            />
            <button
              type="submit"
              className="bg-primary text-on-primary px-5 py-2 rounded-xl font-label-caps text-label-caps uppercase hover:bg-surface-tint transition-colors shrink-0"
            >
              Subscribe
            </button>
          </form>
        </FooterColumn>

        <FooterColumn title="Follow Us">
          <a className={LINK_CLASS} href={facebookUrl} target="_blank" rel="noopener noreferrer">
            Facebook
          </a>
          <a
            className={LINK_CLASS}
            href={`https://instagram.com/${INSTAGRAM_HANDLE}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram
          </a>
        </FooterColumn>
      </div>

      <div className="border-t border-surface-variant py-6 text-center flex flex-col items-center gap-1">
        <p className="font-body-sm text-body-sm text-on-surface-variant">© 2026 A2Z Collection. All rights reserved.</p>
        <p className="text-[10px] text-on-surface-variant/50 font-mono">v{APP_VERSION} (Build #{APP_BUILD})</p>
        <p className="text-[10px] text-on-surface-variant/50">
          Powered by Mobile1x · Founder Rahul Pahuja · +91-8819091000
        </p>
      </div>
    </footer>
  );
}
