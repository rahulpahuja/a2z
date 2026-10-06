const STARS = [1, 2, 3, 4, 5];

// Read-only star display, or a picker when onChange is provided.
export default function StarRating({ value = 0, onChange, size = 'text-base', label }) {
  const interactive = typeof onChange === 'function';
  const filledCount = Math.round(value);

  return (
    <div
      className="flex text-tertiary-container"
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={interactive ? 'Rating' : label ?? `${value.toFixed(1)} out of 5 stars`}
    >
      {STARS.map((star) => {
        const icon = (
          <span
            className={`material-symbols-outlined ${size}`}
            aria-hidden="true"
            style={{ fontVariationSettings: star <= filledCount ? "'FILL' 1" : "'FILL' 0" }}
          >
            star
          </span>
        );
        if (!interactive) return <span key={star}>{icon}</span>;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            onClick={() => onChange(star)}
            className="hover:scale-110 transition-transform"
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
