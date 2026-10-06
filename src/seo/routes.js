// Single source of truth for per-route SEO. Used by the browser (RouteMeta) and by
// the Netlify Edge Function, so crawlers that don't run JavaScript get the same
// titles, descriptions and canonicals as users.

export const SITE_URL = 'https://www.thea2zcollection.com';
export const BRAND_NAME = 'A2Z Collection';
export const DEFAULT_ROBOTS = 'index, follow';
export const NOINDEX_ROBOTS = 'noindex, nofollow';

// Physical location from the A2Z stores page. ClothingStore is the schema.org type
// for a shop that also sells online.
const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'ClothingStore',
  name: BRAND_NAME,
  url: `${SITE_URL}/`,
  address: {
    '@type': 'PostalAddress',
    streetAddress: '111 Main Road, near J K Mobiles, Sindhi Colony',
    addressLocality: 'Indore',
    addressRegion: 'Madhya Pradesh',
    postalCode: '452001',
    addressCountry: 'IN',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 22.7001897, longitude: 75.863683 },
};

const indexable = (title, description, extra = {}) => ({ title, description, ...extra });
const hidden = (title, description = `${title} — ${BRAND_NAME}.`) => ({ title, description, indexable: false });

const ROUTE_SEO = {
  '/': indexable(
    `${BRAND_NAME} | Fashion from Indore`,
    'Shop A2Z Collection online, with delivery across India. Orders ship from our studio in Indore, Madhya Pradesh.',
    { jsonLd: [ORGANIZATION_SCHEMA] }
  ),
  '/products': indexable(
    `Shop All Products | ${BRAND_NAME}`,
    'Browse the full A2Z Collection catalogue of apparel and footwear, with delivery across India.'
  ),
  '/shots': indexable(`Shots | ${BRAND_NAME}`, `Photos and videos from ${BRAND_NAME}.`),
  '/about-us': indexable(`About Us | ${BRAND_NAME}`, `Learn about ${BRAND_NAME}, a fashion brand rooted in Indore, Madhya Pradesh.`),
  '/contact-us': indexable(`Contact Us | ${BRAND_NAME}`, `Get in touch with the ${BRAND_NAME} team.`),
  '/faqs': indexable(`FAQs | ${BRAND_NAME}`, `Answers to common questions about orders, shipping and policies at ${BRAND_NAME}.`),
  '/size-chart': indexable(`Size Chart | ${BRAND_NAME}`, `Find your size with the ${BRAND_NAME} size chart.`),
  '/store-appointment': indexable(`Book a Store Appointment | ${BRAND_NAME}`, `Book a visit to the ${BRAND_NAME} studio in Indore.`),
  '/a2z-stores': indexable(
    `Our Store | ${BRAND_NAME}`,
    `Visit the ${BRAND_NAME} studio at 111 Main Road, Sindhi Colony, Indore.`,
    { jsonLd: [ORGANIZATION_SCHEMA] }
  ),
  '/careers': indexable(`Careers | ${BRAND_NAME}`, `Open roles at ${BRAND_NAME}.`),
  '/feedback': indexable(`Share Feedback | ${BRAND_NAME}`, `Tell ${BRAND_NAME} what you think of your experience.`),
  '/terms-and-conditions': indexable(`Terms and Conditions | ${BRAND_NAME}`, `The terms that apply when you use the ${BRAND_NAME} website.`),
  '/shipping-policy': indexable(`Shipping Policy | ${BRAND_NAME}`, `How ${BRAND_NAME} ships orders across India.`),
  '/return-exchange-policy': indexable(`Return and Exchange Policy | ${BRAND_NAME}`, `The ${BRAND_NAME} return and exchange policy.`),
  '/refund-policy': indexable(`Refund Policy | ${BRAND_NAME}`, `The ${BRAND_NAME} refund policy.`),
  '/privacy-policy': indexable(`Privacy Policy | ${BRAND_NAME}`, `How ${BRAND_NAME} handles your personal information.`),
  // Transactional, account or unfinished pages: never indexed.
  '/cart': hidden('Your Cart'),
  '/checkout/shipping': hidden('Shipping Details'),
  '/checkout/payment': hidden('Payment'),
  '/orders': hidden('My Orders'),
  '/orders/tracking': hidden('Track Your Order'),
  '/profile': hidden('Your Profile'),
  '/watch-and-buy': hidden('Watch and Buy'),
  '/storefront': hidden('Storefront'),
  '/product-alt': hidden('Product'),
  '/__trap__': hidden('Page'),
};

const normalizePath = (pathname) => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname);

// Builds the head spec for a static route. The shape is shared by applyDocumentHead
// (browser) and injectHeadIntoHtml (edge).
export function headForRoute(pathname, entry) {
  return {
    title: entry.title,
    description: entry.description,
    canonical: `${SITE_URL}${pathname === '/' ? '/' : pathname}`,
    robots: entry.indexable === false ? NOINDEX_ROBOTS : DEFAULT_ROBOTS,
    ogType: 'website',
    jsonLd: entry.jsonLd ?? [],
    noscript: '',
  };
}

// Returns the HTTP status and head for any path that isn't a product page
// (product pages are resolved from Firebase by the caller).
export function resolveRouteSeo(pathname) {
  const path = normalizePath(pathname);
  const entry = ROUTE_SEO[path];
  if (entry) return { status: 200, head: headForRoute(path, entry) };
  // Admin area: reachable, but never indexed. Its unknown sub-pages still render the app's own not-found view.
  if (path === '/super' || path.startsWith('/super/')) {
    return { status: 200, head: headForRoute(path, hidden(`Admin | ${BRAND_NAME}`)) };
  }
  // Unknown URL: a real 404 that must not be indexed, and must not inherit the homepage canonical.
  return {
    status: 404,
    head: {
      title: `Page not found | ${BRAND_NAME}`,
      description: `The page you were looking for could not be found on ${BRAND_NAME}.`,
      canonical: null,
      robots: NOINDEX_ROBOTS,
      ogType: 'website',
      jsonLd: [],
      noscript: '',
    },
  };
}
