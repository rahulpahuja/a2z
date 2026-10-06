import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applyDocumentHead } from '../seo/head.js';
import { resolveRouteSeo } from '../seo/routes.js';

// Product pages set their own head from live product data (ProductDetailPage).
const isProductPath = (pathname) => pathname.startsWith('/products/');

// Keeps the document head in step with each route during client-side navigation,
// including the not-found head for unknown URLs.
export default function RouteMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (isProductPath(pathname)) return;
    applyDocumentHead(resolveRouteSeo(pathname).head);
  }, [pathname]);

  return null;
}
