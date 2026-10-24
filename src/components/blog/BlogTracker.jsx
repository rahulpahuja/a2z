import { createContext, useContext, useMemo } from 'react';
import * as analytics from '../../services/analytics.js';

// Analytics for one article. Preview mode (the admin editor) gets a tracker that records nothing,
// so editing and previewing never pollute the numbers.
const NOOP = new Proxy({}, { get: () => () => {} });
const BlogTrackerContext = createContext(NOOP);

export function BlogTrackerProvider({ post, enabled = true, children }) {
  const value = useMemo(() => {
    if (!enabled) return NOOP;
    return {
      product: (product, placement) => analytics.logBlogProductClick(post, product, placement),
      productUnavailable: (productId) => analytics.logBlogProductUnavailableView(post, productId),
      collection: (collection) => analytics.logBlogCollectionClick(post, collection),
      toc: (headingId) => analytics.logBlogToc(post, headingId),
      cta: (name) => analytics.logBlogCta(post, name),
      share: (result) => analytics.logBlogShare(post, result),
      card: (target, source) => analytics.logBlogCardClick(target, source),
      view: () => analytics.logBlogView(post),
      depth: (percent) => analytics.logBlogReadDepth(post, percent),
    };
  }, [post, enabled]);
  return <BlogTrackerContext.Provider value={value}>{children}</BlogTrackerContext.Provider>;
}

export const useBlogTracker = () => useContext(BlogTrackerContext);
