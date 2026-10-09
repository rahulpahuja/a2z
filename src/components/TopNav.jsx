import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToTopNav, topNavLinkToPath, DEFAULT_TOP_NAV_LINKS } from '../services/topNav.js';
import CartIconButton from './CartIconButton.jsx';
import ProfileButton from './ProfileButton.jsx';
import MobileNavDrawer from './MobileNavDrawer.jsx';

export default function TopNav() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [topNavLinks, setTopNavLinks] = useState(DEFAULT_TOP_NAV_LINKS);

  useEffect(() => {
    const unsub = subscribeToTopNav((links) => setTopNavLinks(links));
    return unsub;
  }, []);

  const navLinks = topNavLinks.map((link) => ({ label: link.label, to: topNavLinkToPath(link) }));

  return (
    <>
      <nav className="bg-surface dark:bg-surface-container-highest flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto z-50 docked full-width top-0 sticky flat no shadows">
        <div className="flex items-center gap-gutter">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileNavOpen(true)}
            className="inline-block text-primary dark:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">A2Z Collection</Link>
        </div>
        <div className="hidden md:flex [@media(orientation:landscape)_and_(max-height:500px)]:!hidden gap-gutter items-center">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              className="font-label-caps text-label-caps text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200 uppercase"
              to={link.to}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-unit text-primary dark:text-primary-fixed-dim">
          <CartIconButton className="p-2 hover:opacity-80 transition-opacity duration-200" />
          <ProfileButton className="p-2 hover:opacity-80 transition-opacity duration-200" />
        </div>
      </nav>
      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} links={navLinks} />
    </>
  );
}
