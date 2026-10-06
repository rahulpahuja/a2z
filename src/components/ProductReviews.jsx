import { useMemo, useState } from 'react';
import StarRating from './StarRating.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  REVIEW_LIMITS,
  createProductReview,
  hasVotedHelpful,
  markReviewHelpful,
  sanitizeReview,
} from '../services/productReviews.js';
import { summarizeReviews } from '../utils/reviewStats.js';

const PAGE_SIZE = 5;

const SORT_OPTIONS = [
  { value: 'helpful', label: 'Most helpful', compare: (a, b) => (b.helpful ?? 0) - (a.helpful ?? 0) },
  { value: 'recent', label: 'Most recent', compare: (a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0) },
  { value: 'high', label: 'Highest rated', compare: (a, b) => b.rating - a.rating },
  { value: 'low', label: 'Lowest rated', compare: (a, b) => a.rating - b.rating },
];

const formatReviewDate = (ms) =>
  ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

function RatingBars({ summary }) {
  return (
    <div className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
      {[5, 4, 3, 2, 1].map((star) => {
        const share = summary.count > 0 ? (summary.distribution[star] / summary.count) * 100 : 0;
        return (
          <div key={star} className="flex items-center gap-3">
            <span className="w-6 text-right">{star}★</span>
            <div className="flex-1 h-2 rounded-full bg-surface-container-high overflow-hidden">
              <div className="h-full bg-tertiary-container" style={{ width: `${share}%` }} />
            </div>
            <span className="w-10 text-right">{summary.distribution[star]}</span>
          </div>
        );
      })}
    </div>
  );
}

function ReviewCard({ productId, review }) {
  const { showToast } = useToast();
  const [voted, setVoted] = useState(() => hasVotedHelpful(productId, review.id));

  const handleHelpful = async () => {
    try {
      const counted = await markReviewHelpful(productId, review.id);
      if (counted) setVoted(true);
    } catch {
      showToast('Could not record your vote. Please try again.');
    }
  };

  return (
    <article className="bg-surface rounded-xl border border-outline-variant/40 p-6 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <StarRating value={review.rating} size="text-sm" />
        {review.title && <h4 className="font-title-sm text-title-sm text-on-surface">{review.title}</h4>}
      </div>
      <p className="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-line">{review.body}</p>
      <div className="flex flex-wrap items-center justify-between gap-3 font-body-sm text-body-sm text-outline">
        <span>
          {review.name} · {formatReviewDate(review.createdAtMs)}
        </span>
        <button
          type="button"
          onClick={handleHelpful}
          disabled={voted}
          className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary disabled:opacity-60 disabled:cursor-default transition-colors"
        >
          <span className="material-symbols-outlined text-[1rem]">thumb_up</span>
          {voted ? 'Thanks for your feedback' : 'Helpful'}
          {review.helpful > 0 && <span>({review.helpful})</span>}
        </button>
      </div>
    </article>
  );
}

function ReviewForm({ productId, onDone }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: user?.displayName ?? '', rating: 0, title: '', body: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    let cleaned;
    try {
      cleaned = sanitizeReview(form);
    } catch (validationError) {
      setError(validationError.message);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await createProductReview(productId, cleaned);
      showToast('Thanks! Your review has been posted.');
      onDone();
    } catch {
      setError('We could not post your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-sm text-body-sm text-on-surface';

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-outline-variant/40 p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Your rating</span>
        <StarRating value={form.rating} onChange={(rating) => setForm((prev) => ({ ...prev, rating }))} size="text-2xl" />
      </div>
      <label className="flex flex-col gap-2 font-label-caps text-label-caps text-on-surface-variant uppercase">
        Your name
        <input className={inputClass} maxLength={REVIEW_LIMITS.name} value={form.name} onChange={updateField('name')} />
      </label>
      <label className="flex flex-col gap-2 font-label-caps text-label-caps text-on-surface-variant uppercase">
        Review title <span className="normal-case tracking-normal text-outline">(optional)</span>
        <input className={inputClass} maxLength={REVIEW_LIMITS.title} value={form.title} onChange={updateField('title')} />
      </label>
      <label className="flex flex-col gap-2 font-label-caps text-label-caps text-on-surface-variant uppercase">
        Your review
        <textarea
          className={`${inputClass} min-h-28`}
          maxLength={REVIEW_LIMITS.bodyMax}
          value={form.body}
          onChange={updateField('body')}
          placeholder="What did you like or dislike? How was the fit?"
        />
      </label>
      {error && <p role="alert" className="font-body-sm text-body-sm text-error">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-lg uppercase tracking-widest disabled:opacity-50"
        >
          {submitting ? 'Posting…' : 'Submit review'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="font-label-caps text-label-caps text-on-surface-variant px-4 py-3 uppercase hover:text-primary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function ProductReviews({ productId, reviews }) {
  const [sortBy, setSortBy] = useState('helpful');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [writing, setWriting] = useState(false);

  const summary = useMemo(() => summarizeReviews(reviews), [reviews]);
  const sorted = useMemo(() => {
    const compare = SORT_OPTIONS.find((option) => option.value === sortBy).compare;
    return [...reviews].sort(compare);
  }, [reviews, sortBy]);

  return (
    <div className="flex flex-col gap-8">
      <h2 className="font-headline-md text-headline-md text-on-surface">Ratings &amp; Reviews</h2>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-4 flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <span className="font-price-display text-price-display text-on-surface">
              {summary.count > 0 ? summary.average.toFixed(1) : '—'}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">out of 5</span>
          </div>
          <StarRating value={summary.average} size="text-xl" />
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {summary.count} {summary.count === 1 ? 'rating' : 'ratings'}
          </p>
        </div>
        <div className="md:col-span-5">
          <RatingBars summary={summary} />
        </div>
        <div className="md:col-span-3 flex md:justify-end items-start">
          {!writing && (
            <button
              type="button"
              onClick={() => setWriting(true)}
              className="border-2 border-primary text-primary font-label-caps text-label-caps px-6 py-3 rounded-lg uppercase tracking-widest hover:bg-primary-fixed transition-colors"
            >
              Write a review
            </button>
          )}
        </div>
      </div>

      {writing && <ReviewForm productId={productId} onDone={() => setWriting(false)} />}

      {reviews.length === 0 ? (
        <p className="font-body-lg text-body-lg text-on-surface-variant">No reviews yet. Be the first to share your experience.</p>
      ) : (
        <>
          <label className="flex items-center gap-3 self-end font-body-sm text-body-sm text-on-surface-variant">
            Sort by
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            {sorted.slice(0, visibleCount).map((review) => (
              <ReviewCard key={review.id} productId={productId} review={review} />
            ))}
          </div>
          {visibleCount < sorted.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="self-center font-label-caps text-label-caps text-primary uppercase tracking-widest hover:underline"
            >
              Show more reviews ({sorted.length - visibleCount} left)
            </button>
          )}
        </>
      )}
    </div>
  );
}
