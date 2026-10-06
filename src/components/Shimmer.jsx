import { useStorefrontTheme } from '../context/StorefrontThemeContext.jsx';

// Placeholders shown while catalogue data loads, so visitors see the layout filling
// in rather than an empty or "not found" state. Whether they render at all is set in
// the admin configurator (theme.loadingPlaceholder: 'shimmer' | 'none').

export function ShimmerBlock({ className = '', style }) {
  return <div className={`a2z-shimmer rounded-md ${className}`} style={style} aria-hidden="true" />;
}

function usePlaceholderEnabled() {
  const { theme } = useStorefrontTheme();
  return theme?.loadingPlaceholder !== 'none';
}

export function ProductDetailSkeleton() {
  const enabled = usePlaceholderEnabled();
  if (!enabled) return null;
  return (
    <main
      aria-busy="true"
      aria-label="Loading product"
      className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 md:py-margin-desktop grid grid-cols-1 md:grid-cols-12 gap-gutter"
    >
      <div className="md:col-span-7">
        <ShimmerBlock className="w-full" style={{ aspectRatio: 'var(--custom-detail-img-aspect, 3/4)' }} />
      </div>
      <div className="md:col-span-5 flex flex-col gap-5">
        <ShimmerBlock className="h-4 w-1/4" />
        <ShimmerBlock className="h-10 w-3/4" />
        <ShimmerBlock className="h-6 w-1/3" />
        <ShimmerBlock className="h-12 w-full" />
        <ShimmerBlock className="h-12 w-full" />
      </div>
    </main>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  const enabled = usePlaceholderEnabled();
  if (!enabled) return null;
  return (
    <div aria-busy="true" aria-label="Loading products" className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <ShimmerBlock className="w-full" style={{ aspectRatio: 'var(--custom-listing-img-aspect, 3/4)' }} />
          <ShimmerBlock className="h-4 w-3/4" />
          <ShimmerBlock className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
