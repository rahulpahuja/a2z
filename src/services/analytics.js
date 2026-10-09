// Thin facade over Firebase Analytics (GA4). The rest of the app calls these
// functions instead of talking to the Firebase SDK directly, so analytics
// can be disabled, swapped, or mocked in tests without touching call sites.
import {
  logEvent as firebaseLogEvent,
  setUserId as firebaseSetUserId,
  setUserProperties as firebaseSetUserProperties,
} from 'firebase/analytics';
import { analyticsPromise } from '../firebase.js';

const CURRENCY = 'INR';

async function withAnalytics(run) {
  const analytics = await analyticsPromise;
  if (!analytics) return;
  run(analytics);
}

export function logAnalyticsEvent(eventName, eventParams) {
  withAnalytics((analytics) => firebaseLogEvent(analytics, eventName, eventParams));
}

export function logPageView(pagePath, pageTitle) {
  logAnalyticsEvent('page_view', { page_path: pagePath, page_title: pageTitle });
}

export function setAnalyticsUserId(userId) {
  withAnalytics((analytics) => firebaseSetUserId(analytics, userId));
}

export function setAnalyticsUserProperties(properties) {
  withAnalytics((analytics) => firebaseSetUserProperties(analytics, properties));
}

// Product catalog entries and cart line items use slightly different field
// names for the same thing (title/name, category/categoryTitle) — this
// normalizes either shape into a GA4 item object.
function toGA4Item(source, overrides = {}) {
  return {
    item_id: source.productId || source.id,
    item_name: source.title || source.name,
    item_category: source.category || source.categoryTitle || undefined,
    item_variant: [source.color, source.size].filter(Boolean).join(' / ') || undefined,
    price: Number(source.price) || 0,
    quantity: source.quantity || 1,
    ...overrides,
  };
}

function itemsValue(items) {
  return items.reduce((sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1), 0);
}

export function logViewItemList(items, listName) {
  if (!items?.length) return;
  logAnalyticsEvent('view_item_list', {
    item_list_name: listName,
    items: items.slice(0, 20).map((p) => toGA4Item(p)),
  });
}

export function logSelectItem(product, listName) {
  logAnalyticsEvent('select_item', {
    item_list_name: listName,
    items: [toGA4Item(product)],
  });
}

export function logViewItem(product) {
  logAnalyticsEvent('view_item', {
    currency: CURRENCY,
    value: Number(product.price) || 0,
    items: [toGA4Item(product)],
  });
}

export function logAddToCart(product, quantity = 1) {
  logAnalyticsEvent('add_to_cart', {
    currency: CURRENCY,
    value: (Number(product.price) || 0) * quantity,
    items: [toGA4Item(product, { quantity })],
  });
}

export function logRemoveFromCart(item) {
  logAnalyticsEvent('remove_from_cart', {
    currency: CURRENCY,
    value: (Number(item.price) || 0) * (item.quantity || 1),
    items: [toGA4Item(item)],
  });
}

export function logViewCart(items) {
  if (!items?.length) return;
  logAnalyticsEvent('view_cart', {
    currency: CURRENCY,
    value: itemsValue(items),
    items: items.map((i) => toGA4Item(i)),
  });
}

export function logBeginCheckout(items) {
  if (!items?.length) return;
  logAnalyticsEvent('begin_checkout', {
    currency: CURRENCY,
    value: itemsValue(items),
    items: items.map((i) => toGA4Item(i)),
  });
}

export function logAddShippingInfo(items, shippingTier = 'Standard') {
  if (!items?.length) return;
  logAnalyticsEvent('add_shipping_info', {
    currency: CURRENCY,
    value: itemsValue(items),
    shipping_tier: shippingTier,
    items: items.map((i) => toGA4Item(i)),
  });
}

export function logAddPaymentInfo(items, paymentType = 'Razorpay') {
  if (!items?.length) return;
  logAnalyticsEvent('add_payment_info', {
    currency: CURRENCY,
    value: itemsValue(items),
    payment_type: paymentType,
    items: items.map((i) => toGA4Item(i)),
  });
}

export function logPurchase(order) {
  logAnalyticsEvent('purchase', {
    transaction_id: order.id,
    currency: CURRENCY,
    value: order.total,
    tax: order.tax,
    coupon: order.couponCode || undefined,
    payment_type: order.paymentMethod,
    items: (order.items || []).map((i) => toGA4Item(i)),
  });
}

export function logLogin(method) {
  logAnalyticsEvent('login', { method });
}

export function logSearch(searchTerm) {
  if (!searchTerm) return;
  logAnalyticsEvent('search', { search_term: searchTerm });
}

export function logSelectContent(contentType, itemId) {
  logAnalyticsEvent('select_content', { content_type: contentType, item_id: itemId });
}

export function logShare(method, contentType) {
  logAnalyticsEvent('share', { method, content_type: contentType });
}

// Behaviour events beyond the GA4 ecommerce set: what visitors do between landing and buying.
export function logSelectPromotion(promotionName, destination) {
  logAnalyticsEvent('select_promotion', { promotion_name: promotionName, creative_name: destination });
}

export function logAddToWishlist(product) {
  logAnalyticsEvent('add_to_wishlist', {
    currency: CURRENCY,
    value: Number(product.price) || 0,
    items: [toGA4Item(product)],
  });
}

export function logSelectVariant(variantType, variantValue, product) {
  logAnalyticsEvent('select_variant', {
    variant_type: variantType,
    variant_value: variantValue,
    item_id: product.id,
    item_name: product.title || product.name,
  });
}

// Only the filters actually in use are sent, so GA4 reports show what shoppers narrow by.
export function logFilterProducts(filters) {
  const active = Object.fromEntries(Object.entries(filters).filter(([, value]) => value != null && value !== '' && value !== 'All'));
  logAnalyticsEvent('filter_products', active);
}

export function logApplyCoupon(coupon, outcome) {
  logAnalyticsEvent('apply_coupon', { coupon: String(coupon ?? '').toUpperCase(), outcome });
}

export function logSearchNoResults(searchTerm) {
  logAnalyticsEvent('search_no_results', { search_term: searchTerm });
}

export function logFormSubmit(formName, outcome) {
  logAnalyticsEvent('form_submit', { form_name: formName, outcome });
}

export function logPaymentFailure(reason, value) {
  logAnalyticsEvent('payment_failed', { reason, currency: CURRENCY, value: Number(value) || 0 });
}

export function logPageNotFound(path) {
  logAnalyticsEvent('page_not_found', { page_path: path, referrer: typeof document === 'undefined' ? '' : document.referrer });
}

export function logVideoStart(videoTitle, source) {
  logAnalyticsEvent('video_start', { video_title: videoTitle, source });
}

export function logViewPromotion(promotionName, destination) {
  logAnalyticsEvent('view_promotion', { promotion_name: promotionName, creative_name: destination });
}

export function logViewCollection(collection, productCount) {
  logAnalyticsEvent('view_collection', {
    collection_id: collection.id,
    collection_name: collection.name,
    display_mode: collection.displayMode || 'expanded',
    product_count: productCount,
  });
}
