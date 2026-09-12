import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { logPageView } from '../services/analytics.js';
import { useProducts } from '../context/ProductsContext.jsx';

const SITE_NAME = 'A2Z Collection';

// Kept in sync with src/App.jsx's route lists — without this, every page
// reported the same static document.title to GA4, making every page_view
// indistinguishable in reports (e.g. "Pages and screens") that group by title.
const ROUTE_TITLES = {
  '/': 'Home',
  '/storefront': 'Storefront (Alt Home)',
  '/products': 'Product Listing',
  '/product-alt': 'Product Detail (Alt)',
  '/cart': 'Cart',
  '/checkout/shipping': 'Checkout - Shipping',
  '/checkout/payment': 'Checkout - Payment',
  '/orders/tracking': 'Order Tracking',
  '/orders': 'My Orders',
  '/profile': 'Profile',
  '/watch-and-buy': 'Watch and Buy',
  '/shots': 'Shots',
  '/privacy-policy': 'Privacy Policy',
  '/contact-us': 'Contact Us',
  '/about-us': 'About Us',
  '/faqs': 'FAQs',
  '/size-chart': 'Size Chart',
  '/store-appointment': 'Store Appointment',
  '/a2z-stores': 'A2Z Stores',
  '/careers': 'Careers',
  '/feedback': 'Feedback',
  '/terms-and-conditions': 'Terms and Conditions',
  '/shipping-policy': 'Shipping Policy',
  '/return-exchange-policy': 'Return and Exchange Policy',
  '/refund-policy': 'Refund Policy',
  '/dashboard': 'Admin Dashboard',
  '/super': 'Admin Dashboard',
  '/super/categories': 'Admin - Categories',
  '/super/products': 'Admin - Products',
  '/super/trash': 'Admin - Trash',
  '/super/product-videos': 'Admin - Product Videos',
  '/super/sales': 'Admin - Sales',
  '/super/local-billing': 'Admin - Local Billing',
  '/super/analytics': 'Admin - Analytics',
  '/super/collections': 'Admin - Collections',
  '/super/coupons': 'Admin - Coupons',
  '/super/bill-template': 'Admin - Bill Template',
  '/super/referrers': 'Admin - Referrers',
  '/super/settings': 'Admin - Settings',
  '/super/tracking-partners': 'Admin - Tracking Partners',
  '/super/payment-gateway': 'Admin - Payment Gateway',
  '/super/configurator': 'Admin - Configurator',
  '/super/usage-billing': 'Admin - Usage Billing',
  '/super/docs': 'Admin - Docs',
  '/super/image-studio': 'Admin - Image Studio',
  '/super/jobs': 'Admin - Jobs',
  '/super/feedback': 'Admin - Feedback',
};

function resolvePageName(pathname, products) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];

  const productMatch = pathname.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    const product = products.find((p) => p.id === decodeURIComponent(productMatch[1]));
    return product ? product.title || product.name || 'Product Detail' : 'Product Detail';
  }

  return 'Page Not Found';
}

export default function AnalyticsListener() {
  const { pathname, search } = useLocation();
  const { products } = useProducts();

  // Keeps the browser tab title correct too — reacts to `products` loading
  // in so a product page's title fills in once its name is available.
  useEffect(() => {
    document.title = `${resolvePageName(pathname, products)} – ${SITE_NAME}`;
  }, [pathname, products]);

  // Fires strictly on navigation, not on every unrelated `products` refresh
  // (a live product-stock update, say), which would otherwise send a
  // duplicate page_view unconnected to any real page change.
  useEffect(() => {
    const pageName = resolvePageName(pathname, products);
    logPageView(pathname + search, `${pageName} – ${SITE_NAME}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  return null;
}
