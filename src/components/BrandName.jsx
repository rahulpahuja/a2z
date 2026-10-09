// The store name with its logo (the favicon) on the left. Sized in em, so it scales
// with whatever heading style the surrounding link already uses. 1.3em matches those
// styles' line height, so the logo never makes a sticky header taller than its text.
export default function BrandName() {
  return (
    <span className="flex items-center gap-2 max-w-full">
      <img src="/favicon.png" alt="" aria-hidden="true" className="h-[1.3em] w-[1.3em] shrink-0 object-contain" />
      <span className="truncate">A2Z Collection</span>
    </span>
  );
}
