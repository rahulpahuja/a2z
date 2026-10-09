import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { applyDocumentHead } from '../seo/head.js';
import { normalizePath, resolveRouteSeo } from '../seo/routes.js';
import { applyPageMeta, pageMetaKey } from '../seo/pageMeta.js';
import { subscribeToPageMeta } from '../services/pageMeta.js';

// Product and collection pages set their own head from live data (ProductDetailPage, CollectionPage).
const hasOwnHead = (pathname) => pathname.startsWith('/products/') || pathname.startsWith('/collections/');

// Keeps the document head in step with each route during client-side navigation,
// including the not-found head for unknown URLs.
export default function RouteMeta() {
  const { pathname } = useLocation();
  const [pageMeta, setPageMeta] = useState({});

  useEffect(() => subscribeToPageMeta(setPageMeta), []);

  useEffect(() => {
    if (hasOwnHead(pathname)) return;
    const { head } = resolveRouteSeo(pathname);
    applyDocumentHead(applyPageMeta(head, pageMeta[pageMetaKey(normalizePath(pathname))]));
  }, [pathname, pageMeta]);

  return null;
}
