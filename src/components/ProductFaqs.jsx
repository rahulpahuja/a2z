import { logSelectContent } from '../services/analytics.js';
// Per-product FAQ accordion. Uses native <details> so open/close state, keyboard
// handling and screen-reader announcements come from the browser. Renders nothing
// when the product has no FAQs, so the section never appears empty.
export default function ProductFaqs({ faqs }) {
  if (faqs.length === 0) return null;

  return (
    <section id="faqs" className="mb-16 scroll-mt-24">
      <h2 className="font-headline-md text-headline-md text-on-surface mb-8">Frequently Asked Questions</h2>
      <div className="flex flex-col divide-y divide-outline-variant/40 border-y border-outline-variant/40">
        {faqs.map((faq, index) => (
          <details
            key={`${index}-${faq.question}`}
            className="group py-5"
            onToggle={(event) => event.currentTarget.open && logSelectContent('product_faq', faq.question)}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-title-sm text-title-sm text-on-surface [&::-webkit-details-marker]:hidden">
              {faq.question}
              <span className="material-symbols-outlined shrink-0 text-primary transition-transform duration-200 group-open:rotate-45" aria-hidden="true">
                add
              </span>
            </summary>
            <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant whitespace-pre-line">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
