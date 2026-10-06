// Aggregates a product's reviews into the numbers shown in the rating summary.
// Pure so the detail page and any future surface (cards, SEO) share one definition.
// Reviews without a usable 1–5 rating are excluded from every figure, so the
// count, average and distribution always describe the same set of ratings.
export function summarizeReviews(reviews) {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let total = 0;
  let count = 0;
  reviews.forEach((review) => {
    const rating = Math.round(review.rating);
    if (rating >= 1 && rating <= 5) {
      distribution[rating] += 1;
      total += rating;
      count += 1;
    }
  });
  return {
    count,
    average: count > 0 ? total / count : 0,
    distribution,
  };
}
