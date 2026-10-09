import { escapeAttr } from './head.js';
import { BRAND_NAME, DEFAULT_ROBOTS, SITE_URL } from './routes.js';

// Head, JSON-LD and crawlable copy for a collection page. Like the product head, it is
// built only from what the page itself shows. `image` is the collection's cover URL.
export function buildCollectionHead(collection, { image } = {}) {
  const url = `${SITE_URL}/collections/${encodeURIComponent(collection.id)}`;
  const description = `Shop the ${collection.name} collection from ${BRAND_NAME}, with delivery across India.`;
  const ogImage = typeof image === 'string' && image.startsWith('http') ? image : undefined;

  return {
    title: `${collection.name} | ${BRAND_NAME}`,
    description,
    canonical: url,
    robots: DEFAULT_ROBOTS,
    ogType: 'website',
    ogImage,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: collection.name,
        description,
        url,
        ...(ogImage ? { image: ogImage } : {}),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: collection.name, item: url },
        ],
      },
    ],
    noscript: `<article><h1>${escapeAttr(collection.name)}</h1><p>${escapeAttr(description)}</p></article>`,
  };
}
