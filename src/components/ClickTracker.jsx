import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { logAnalyticsEvent } from '../services/analytics.js';
import { describeClick } from '../utils/clickTracking.js';

// Reports a `ui_click` GA4 event for every link, button and tab a visitor clicks on the storefront. The specific
// shopping events (add_to_cart, select_item, ...) still fire from their own components; this adds the options
// they do not cover, such as menu and footer links. See utils/clickTracking.js for what is left out.
export default function ClickTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    const onClick = (event) => {
      const params = describeClick(event.target, { pathname, origin: window.location.origin });
      if (params) logAnalyticsEvent('ui_click', params);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname]);

  return null;
}
