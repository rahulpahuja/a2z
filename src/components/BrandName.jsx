// The store name with its logo (the favicon) on the left. Sized in em, so it scales
// with whatever heading style the surrounding link already uses.
export default function BrandName() {
  return (
    <span className="inline-flex items-center gap-2 max-w-full">
      <img src="/favicon.png" alt="" aria-hidden="true" className="h-[1.6em] w-[1.6em] shrink-0 object-contain" />
      <span className="truncate">A2Z Collection</span>
    </span>
  );
}
