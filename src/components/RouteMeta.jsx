import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applyDocumentHead } from '../seo/head.js';
import { NOINDEX_ROBOTS, resolveRouteSeo } from '../seo/routes.js';

// Product pages set their own head from live product data (ProductDetailPage).
const isProductPath = (pathname) => pathname.startsWith('/products/');

// Keeps the document head in step with static routes during client-side navigation.
export default function RouteMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (isProductPath(pathname)) return;
    const { head } = resolveRouteSeo(pathname);
    if (head) {
      applyDocumentHead(head);
      return;
    }
    // Unknown route: the app renders its own not-found view, which must not be indexed.
    document.querySelector('meta[name="robots"]')?.setAttribute('content', NOINDEX_ROBOTS);
  }, [pathname]);

  return null;
}
