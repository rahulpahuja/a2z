import { useState } from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter.jsx';

const FAQ_SECTIONS = [
  {
    title: 'Returns & Refunds',
    items: [
      {
        question: 'What is your return & refund policy?',
        answer:
          'We sell quality products and we believe in no returns and no exchanges. There are no returns, exchanges, or refunds offered under any circumstances — even if you receive a faulty product. If you miss a delivery, reattempts will be made by our courier partner. If a parcel is returned to us, you can request a resend (resend shipping charges apply).',
      },
      {
        question: 'Can I exchange a product if it is faulty or defective?',
        answer:
          'No. We sell quality products and we believe in no returns and no exchanges. If you get a faulty product, there is no exchange for that.',
      },
      {
        question: 'Can I cancel my order after placing it?',
        answer:
          'There is no provision for order cancellation once an order is placed.',
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
        answer: 'We accept major credit/debit cards, UPI, and popular digital wallets — all orders are prepaid at checkout.',
      },
      {
        question: 'Why don’t you offer Cash on Delivery (COD)?',
        answer:
          'We sell quality products and stand by them, and we’d rather serve customers who value that the same way we do. COD tends to attract low-intent orders and a high rate of refused deliveries, which drives up costs for everyone and slows down genuine customers. Paying upfront keeps our pricing fair and our service reliable — if you want a quality product, that commitment starts at checkout.',
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
