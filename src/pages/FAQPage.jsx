import { useState } from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter.jsx';

const FAQ_SECTIONS = [
  {
    title: 'Returns & Refunds',
    items: [
      {
        question: 'What is your return policy?',
        answer:
          'Due to the delicate handcrafted nature of our products, NO RETURNS are accepted unless the product is defective or damaged upon arrival. If you receive a defective item, contact us within 48 hours of delivery with photos of the issue and we will arrange a replacement or refund.',
      },
      {
        question: 'Can I exchange an item for a different size?',
        answer:
          'Yes. Size exchanges are permitted within 7 days of delivery, subject to inventory availability. The item must be unworn, unwashed, and returned with its original tags attached.',
      },
      {
        question: 'How long do refunds take to process?',
        answer:
          'Refunds for eligible defective items are processed within 5-7 business days of us receiving and inspecting the returned product.',
      },
    ],
  },
  {
    title: 'Shipping & Delivery',
    items: [
      {
        question: 'Do you offer free shipping?',
        answer: 'Yes — we offer free standard shipping on all orders above ₹2,000. Express delivery options are available at checkout for a fee.',
      },
      {
        question: 'How long will my order take to arrive?',
        answer: 'Most orders are delivered within 3 to 7 business days, depending on your location and the delivery partner serving your area.',
      },
      {
        question: 'How is my order packaged?',
        answer: 'Every item is carefully packaged in our signature artisan boxes to ensure it arrives in perfect condition.',
      },
    ],
  },
  {
    title: 'Orders & Payments',
    items: [
      {
        question: 'How can I track my order?',
        answer: 'Once your order ships, you can track it anytime from the Order Tracking page using your order ID, or from your account menu if you were signed in when you placed the order.',
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept major credit/debit cards, UPI, popular digital wallets, and Cash on Delivery (COD) where available.',
      },
      {
        question: 'How do I find my size?',
        answer: 'Each product page includes a Size Guide link next to the size selector to help you find the right fit before you order.',
      },
    ],
  },
];

function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="border-b border-outline-variant/30">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex justify-between items-center gap-4 py-5 text-left"
      >
        <span className="font-title-sm text-title-sm text-on-surface">{question}</span>
        <span className="material-symbols-outlined text-on-surface-variant shrink-0">
          {isOpen ? 'remove' : 'add'}
        </span>
      </button>
      {isOpen && (
        <p className="font-body-lg text-body-lg text-on-surface-variant pb-5 pr-8">{answer}</p>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [openKey, setOpenKey] = useState('Returns & Refunds-0');

  return (
    <>
      <header className="w-full px-margin-mobile md:px-margin-desktop py-4 bg-surface border-b border-surface-variant flex justify-between items-center max-w-container-max mx-auto">
        <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
          A2Z Collection
        </Link>
        <Link to="/" className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors">
          Back to Home
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <div className="text-center mb-12">
          <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest">Help Center</span>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mt-3 mb-4 playfair">
            Frequently Asked Questions
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Everything you need to know about returns, shipping, and orders.
          </p>
        </div>

        <div className="flex flex-col gap-10">
          {FAQ_SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="font-headline-md-mobile text-headline-md-mobile text-on-surface mb-2 playfair">
                {section.title}
              </h2>
              <div>
                {section.items.map((item, idx) => {
                  const key = `${section.title}-${idx}`;
                  return (
                    <FAQItem
                      key={key}
                      question={item.question}
                      answer={item.answer}
                      isOpen={openKey === key}
                      onToggle={() => setOpenKey((prev) => (prev === key ? null : key))}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
