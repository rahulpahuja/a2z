import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createFeedback } from '../services/feedback.js';
import { useToast } from '../context/ToastContext.jsx';
import SiteFooter from '../components/SiteFooter.jsx';

const EMPTY_FORM = { name: '', email: '', rating: 0, message: '' };

export default function FeedbackPage() {
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await createFeedback(form);
      showToast('Thank you for your feedback!');
      setForm(EMPTY_FORM);
    } catch (err) {
      showToast(err.message || 'Could not submit your feedback right now.');
    } finally {
      setSubmitting(false);
    }
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

      <main className="max-w-xl mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <div className="text-center mb-10">
          <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest">We're Listening</span>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mt-3 mb-4 playfair">
            Share Your Feedback
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Good, bad, or somewhere in between — we read every message and use it to improve.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-surface-container-low border border-tertiary-container/30 rounded-xl p-6 md:p-8">
          <div className="flex flex-col gap-2">
            <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="feedback-name">
              Name (optional)
            </label>
            <input
              id="feedback-name"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="Your name"
              className="bg-transparent border-b border-outline focus:border-primary focus:ring-0 outline-none py-2 font-body-sm text-body-sm text-on-surface transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="feedback-email">
              Email (optional)
            </label>
            <input
              id="feedback-email"
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              placeholder="you@example.com"
              className="bg-transparent border-b border-outline focus:border-primary focus:ring-0 outline-none py-2 font-body-sm text-body-sm text-on-surface transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-label-caps text-label-caps text-on-surface-variant">Overall Rating</span>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={form.rating === star}
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, rating: star }))}
                  className="text-2xl leading-none"
                >
                  <span
                    className={`material-symbols-outlined ${form.rating >= star ? 'text-tertiary' : 'text-outline-variant'}`}
                    style={{ fontVariationSettings: form.rating >= star ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="feedback-message">
              Your Feedback
            </label>
            <textarea
              id="feedback-message"
              required
              rows={5}
              value={form.message}
              onChange={handleChange('message')}
              placeholder="Tell us what's on your mind…"
              className="bg-transparent border border-outline rounded-lg focus:border-primary focus:ring-0 outline-none py-2 px-3 font-body-sm text-body-sm text-on-surface transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !form.message.trim()}
            className="bg-primary text-on-primary font-label-caps text-label-caps py-4 rounded-xl uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Submit Feedback'}
          </button>
        </form>
      </main>

      <SiteFooter />
    </>
  );
}
