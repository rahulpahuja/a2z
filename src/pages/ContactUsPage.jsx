import { useState } from 'react';
import { Link } from 'react-router-dom';
import { WHATSAPP_NUMBER, INSTAGRAM_HANDLE } from '../config/store.js';
import { useToast } from '../context/ToastContext.jsx';
import { buildWhatsAppLink } from '../utils/whatsapp.js';
import SiteFooter from '../components/SiteFooter.jsx';

const CONTACT_METHODS = [
  {
    label: 'WhatsApp',
    detail: WHATSAPP_NUMBER,
    icon: 'chat',
    href: buildWhatsAppLink(WHATSAPP_NUMBER),
  },
  {
    label: 'Instagram',
    detail: `@${INSTAGRAM_HANDLE}`,
    icon: 'photo_camera',
    href: `https://instagram.com/${INSTAGRAM_HANDLE}`,
  },
];

export default function ContactUsPage() {
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      showToast(`Thanks${form.name.trim() ? `, ${form.name.trim().split(' ')[0]}` : ''}! We'll get back to you soon.`);
      setForm({ name: '', email: '', message: '' });
      setSubmitting(false);
    }, 500);
  };

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

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest">Get in Touch</span>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mt-3 mb-4 playfair">
            Contact Us
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Questions about an order, a custom piece, or just want to say hello? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div className="flex flex-col gap-4">
            {CONTACT_METHODS.map((method) => (
              <a
                key={method.label}
                href={method.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-5 bg-surface-container-low border border-tertiary-container/30 rounded-xl hover:border-primary transition-colors"
              >
                <span className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">{method.icon}</span>
                </span>
                <div>
                  <p className="font-title-sm text-title-sm text-on-surface">{method.label}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{method.detail}</p>
                </div>
              </a>
            ))}
            <div className="p-5 bg-surface-container-low border border-tertiary-container/30 rounded-xl">
              <p className="font-title-sm text-title-sm text-on-surface mb-1">Response Time</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                We typically reply within 24 hours on business days.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="contact-name">
                Name
              </label>
              <input
                id="contact-name"
                required
                value={form.name}
                onChange={handleChange('name')}
                placeholder="Your full name"
                className="bg-transparent border-b border-outline focus:border-primary focus:ring-0 outline-none py-2 font-body-sm text-body-sm text-on-surface transition-colors"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="contact-email">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={form.email}
                onChange={handleChange('email')}
                placeholder="you@example.com"
                className="bg-transparent border-b border-outline focus:border-primary focus:ring-0 outline-none py-2 font-body-sm text-body-sm text-on-surface transition-colors"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="contact-message">
                Message
              </label>
              <textarea
                id="contact-message"
                required
                rows={5}
                value={form.message}
                onChange={handleChange('message')}
                placeholder="How can we help?"
                className="bg-transparent border border-outline rounded-lg focus:border-primary focus:ring-0 outline-none py-2 px-3 font-body-sm text-body-sm text-on-surface transition-colors resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-on-primary font-label-caps text-label-caps py-4 rounded-xl uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
