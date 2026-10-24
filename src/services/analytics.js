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

// A shopper tapped "Buy on WhatsApp" on a product page. Counts intent to order, not a placed order.
export function logBuyOnWhatsapp(line, quantity = 1) {
  const item = toGA4Item(line, { quantity });
  logAnalyticsEvent('buy_on_whatsapp', {
    currency: CURRENCY,
    value: itemsValue([item]),
    items: [item],
  });
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

// ---- Shots (short product videos) ---------------------------------------------------------------
// Every interaction on the Shots feed. `shot` is { id, productId }.

const shotParams = (shot, extra = {}) => ({ shot_id: shot.id, product_id: shot.productId, ...extra });

// A short stayed on screen long enough to count. `counted` is false when this session had already counted it.
export function logShotView(shot, counted) {
  logAnalyticsEvent('shot_view', shotParams(shot, { counted: Boolean(counted) }));
}

export function logShotLike(shot, liked) {
  logAnalyticsEvent(liked ? 'shot_like' : 'shot_unlike', shotParams(shot));
}

// result: 'shared' (native share sheet) | 'copied' (link copied) | 'cancelled' | 'failed'
export function logShotShare(shot, result) {
  if (result === 'shared' || result === 'copied') {
    logAnalyticsEvent('share', shotParams(shot, { method: result === 'shared' ? 'native' : 'copy_link', content_type: 'shot', item_id: shot.id }));
  } else {
    logAnalyticsEvent(result === 'cancelled' ? 'shot_share_cancelled' : 'shot_share_failed', shotParams(shot));
  }
}

export function logShotSwipe(shot, index) {
  logAnalyticsEvent('shot_swipe', shotParams(shot, { index }));
}

export function logShotMuteToggle(shot, muted) {
  logAnalyticsEvent('shot_mute_toggle', shotParams(shot, { muted: Boolean(muted) }));
}

// Someone opened /shots?v=<id> from a shared link. `found` is false when that short no longer exists.
export function logShotDeepLink(shotId, found) {
  logAnalyticsEvent(found ? 'shot_deeplink_open' : 'shot_deeplink_missing', { shot_id: shotId });
}

// ---- Blog -------------------------------------------------------------------------------------
// `post` is any object with { id, slug, type, categoryId, readingMinutes? }.

const blogParams = (post, extra = {}) => ({
  post_id: post.id,
  post_slug: post.slug,
  post_type: post.type,
  category_id: post.categoryId || undefined,
  ...extra,
});

export function logBlogListView(articleCount) {
  logAnalyticsEvent('blog_list_view', { article_count: articleCount });
}

export function logBlogSearch(term, results) {
  logAnalyticsEvent('blog_search', { search_term: term, results });
}

// kind: 'category' | 'tag' | 'clear'
export function logBlogFilter(kind, value) {
  logAnalyticsEvent('blog_filter', { filter_type: kind, filter_value: value || '' });
}

export function logBlogLoadMore(shown) {
  logAnalyticsEvent('blog_load_more', { shown });
}

// A card on the blog landing page was opened. `source`: 'featured' | 'guides' | 'collections' | 'grid' | 'related' | 'prev_next'.
export function logBlogCardClick(post, source) {
  logAnalyticsEvent('select_content', { content_type: 'blog_post', item_id: post.id });
  logAnalyticsEvent('blog_card_click', blogParams(post, { source }));
}

export function logBlogView(post) {
  logAnalyticsEvent('blog_view', blogParams(post, { reading_minutes: post.readingMinutes }));
}

// Scroll depth milestones: 25, 50, 75, 100.
export function logBlogReadDepth(post, percent) {
  logAnalyticsEvent('blog_read_depth', blogParams(post, { percent }));
}

// placement: 'inline' | 'comparison' | 'related' | 'hero'
export function logBlogProductClick(post, product, placement) {
  logSelectItem(product, `Blog - ${post.title || post.slug}`);
  logAnalyticsEvent('blog_product_click', blogParams(post, { product_id: product.id, placement }));
}

export function logBlogProductUnavailableView(post, productId) {
  logAnalyticsEvent('blog_product_unavailable', blogParams(post, { product_id: productId }));
}

export function logBlogCollectionClick(post, collection) {
  logAnalyticsEvent('blog_collection_click', blogParams(post, { collection_id: collection.id }));
}

export function logBlogToc(post, headingId) {
  logAnalyticsEvent('blog_toc_click', blogParams(post, { heading_id: headingId }));
}

// cta: 'shop_all' | 'shop_collection' | 'shop_the_guide' | 'back_to_blog'
export function logBlogCta(post, cta) {
  logAnalyticsEvent('blog_cta_click', blogParams(post, { cta }));
}

// result: 'shared' | 'copied' | 'cancelled' | 'failed' | 'whatsapp' | 'facebook' | 'x'
export function logBlogShare(post, result) {
  if (['shared', 'copied', 'whatsapp', 'facebook', 'x'].includes(result)) {
    const method = { shared: 'native', copied: 'copy_link' }[result] ?? result;
    logAnalyticsEvent('share', blogParams(post, { method, content_type: 'blog_post', item_id: post.id }));
  } else {
    logAnalyticsEvent(result === 'cancelled' ? 'blog_share_cancelled' : 'blog_share_failed', blogParams(post));
  }
}

// ---- Product listing pagination ---------------------------------------------------------------
// source: 'next_button' (the large button under the grid) | 'pager' (the numbered pager) | 'back_to_top'
export function logListingPageChange(page, source) {
  logAnalyticsEvent('listing_page_change', { page, source });
}

// ---- Checkout: sign-in and delivery address -------------------------------------------------------
// source: where the sign-in was asked for ('cart').
export function logCheckoutSignInPrompt(source) {
  logAnalyticsEvent('checkout_sign_in_prompt', { source });
}

export function logCheckoutSignInComplete(source) {
  logAnalyticsEvent('checkout_sign_in_complete', { source });
}

export function logCheckoutSignInDismissed(source) {
  logAnalyticsEvent('checkout_sign_in_dismissed', { source });
}

// choice: 'saved' (a saved address was chosen or preselected) | 'new' (deliver to a new address)
export function logCheckoutAddressChoice(choice, savedCount) {
  logAnalyticsEvent('checkout_address_choice', { choice, saved_count: savedCount });
}

export function logCheckoutAddressEdit() {
  logAnalyticsEvent('checkout_address_edit');
}

export function logCheckoutAddressSaveToggle(checked, mode) {
  logAnalyticsEvent('checkout_address_save_toggle', { checked: Boolean(checked), mode });
}

// outcome: 'saved_new' | 'updated' | 'duplicate_skipped' | 'not_saved'
export function logCheckoutAddressSave(outcome) {
  logAnalyticsEvent('checkout_address_save', { outcome });
}
