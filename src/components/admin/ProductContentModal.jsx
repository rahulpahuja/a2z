import { useState } from 'react';
import ProductFaqEditor from './ProductFaqEditor.jsx';
import ProductReviewModeration from './ProductReviewModeration.jsx';

const TABS = [
  { id: 'faqs', label: 'FAQs', Panel: ProductFaqEditor },
  { id: 'reviews', label: 'Reviews', Panel: ProductReviewModeration },
];

// Admin shell for the per-product storefront content that lives outside the
// product record (FAQs and customer reviews).
export default function ProductContentModal({ product, onClose }) {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const productName = product.title || product.name || 'Product';
  const { Panel } = TABS.find((tab) => tab.id === activeTab);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`FAQs and reviews for ${productName}`}
      className="fixed inset-0 z-[300] bg-on-surface/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-surface w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col">
        <header className="flex items-start justify-between gap-4 p-6 border-b border-outline-variant/30">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">FAQs &amp; Reviews</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{productName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        <div role="tablist" className="flex gap-6 px-6 border-b border-outline-variant/30">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 font-label-caps text-label-caps uppercase border-b-2 -mb-px transition-colors ${
                activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="p-6 overflow-y-auto">
          <Panel productId={product.id} />
        </div>
      </div>
    </div>
  );
}
