import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { subscribeToStoreSettings } from '../services/storeSettings.js';
import { sanitizeFooterText, isFooterNotePath } from '../utils/footerText.js';
import './FooterNote.css';

function useFooterText(key) {
  const [text, setText] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToStoreSettings((settings) => setText(sanitizeFooterText(settings?.[key])));
    return unsubscribe;
  }, [key]);

  return text;
}

// Super-user-managed note shown at the bottom of every customer-facing page
// (Store Settings > Footer Text). Mounted once in the app shell rather than in
// each page, so pages without SiteFooter (cart, checkout, 404…) get it too.
export function SiteFooterNote() {
  const { pathname } = useLocation();
  const text = useFooterText('siteFooterText');
  if (!text || !isFooterNotePath(pathname)) return null;
  return (
    <div className="footer-note footer-note--site" role="note">
      <p className="footer-note__text">{text}</p>
    </div>
  );
}

// Super-user-managed note shown on every product detail page.
export function ProductFooterNote() {
  const text = useFooterText('productFooterText');
  if (!text) return null;
  return (
    <div className="footer-note footer-note--product" role="note">
      <p className="footer-note__text">{text}</p>
    </div>
  );
}
