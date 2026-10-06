import { useEffect, useState } from 'react';
import StarRating from '../StarRating.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { deleteProductReview, subscribeToProductReviews } from '../../services/productReviews.js';

const formatReviewDate = (ms) =>
  ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export default function ProductReviewModeration({ productId }) {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState(null);

  useEffect(() => subscribeToProductReviews(productId, (rows) => setReviews(rows)), [productId]);

  if (reviews === null) {
    return <p className="font-body-sm text-body-sm text-on-surface-variant">Loading reviews…</p>;
  }
  if (reviews.length === 0) {
    return <p className="font-body-sm text-body-sm text-on-surface-variant">No reviews yet for this product.</p>;
  }

  const handleDelete = async (review) => {
    if (!window.confirm(`Delete this ${review.rating}-star review by ${review.name}? This cannot be undone.`)) return;
    try {
      await deleteProductReview(productId, review.id);
      showToast('Review deleted.');
    } catch {
      showToast('Could not delete the review. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <div key={review.id} className="flex flex-col gap-2 rounded-xl border border-outline-variant/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <StarRating value={review.rating} size="text-sm" />
              <span className="font-body-sm text-body-sm text-on-surface">{review.name}</span>
              <span className="font-body-sm text-body-sm text-outline">{formatReviewDate(review.createdAtMs)}</span>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(review)}
              className="font-label-caps text-label-caps text-error hover:underline"
            >
              Delete
            </button>
          </div>
          {review.title && <p className="font-title-sm text-title-sm text-on-surface">{review.title}</p>}
          <p className="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-line">{review.body}</p>
          <p className="font-body-sm text-body-sm text-outline">Helpful votes: {review.helpful ?? 0}</p>
        </div>
      ))}
    </div>
  );
}
