import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { subscribeToStoreSettings } from '../services/storeSettings.js';
import { isFooterNotePath, resolvePageFooterText, resolveProductFooterText } from '../utils/footerText.js';
import './FooterNote.css';

// Follows the store settings and picks this page's (or product's) text with `resolve`.
function useFooterText(resolve) {
  const [text, setText] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToStoreSettings((settings) => setText(resolve(settings)));
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolve.key]);

  return text;
}

// Super-user-managed note shown at the bottom of every customer-facing page
// (Store Settings > Footer Text). Mounted once in the app shell rather than in
// each page, so pages without SiteFooter (cart, checkout, 404…) get it too.
export function SiteFooterNote() {
  const { pathname } = useLocation();
  const resolver = useMemo(() => Object.assign((settings) => resolvePageFooterText(settings, pathname), { key: pathname }), [pathname]);
  const text = useFooterText(resolver);
  if (!text || !isFooterNotePath(pathname)) return null;
  return (
    <div className="footer-note footer-note--site" role="note">
      <p className="footer-note__text">{text}</p>
    </div>
  );
}

// Super-user-managed note shown on every product detail page.
export function ProductFooterNote({ product }) {
  const footerText = product?.footerText;
  const resolver = useMemo(() => Object.assign((settings) => resolveProductFooterText(settings, { footerText }), { key: footerText }), [footerText]);
  const text = useFooterText(resolver);
  if (!text) return null;
  return (
    <div className="footer-note footer-note--product" role="note">
      <p className="footer-note__text">{text}</p>
    </div>
  );
}
