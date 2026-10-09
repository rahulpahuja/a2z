import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { applyDocumentHead } from '../seo/head.js';
import { normalizePath, resolveRouteSeo } from '../seo/routes.js';
import { applyPageMeta, pageMetaKey } from '../seo/pageMeta.js';
import { subscribeToPageMeta } from '../services/pageMeta.js';

// Product pages set their own head from live product data (ProductDetailPage).
const isProductPath = (pathname) => pathname.startsWith('/products/');

// Keeps the document head in step with each route during client-side navigation,
// including the not-found head for unknown URLs.
export default function RouteMeta() {
  const { pathname } = useLocation();
  const [pageMeta, setPageMeta] = useState({});

  useEffect(() => subscribeToPageMeta(setPageMeta), []);

  useEffect(() => {
    if (isProductPath(pathname)) return;
    const { head } = resolveRouteSeo(pathname);
    applyDocumentHead(applyPageMeta(head, pageMeta[pageMetaKey(normalizePath(pathname))]));
  }, [pathname, pageMeta]);

  return null;
}
