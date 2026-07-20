// Always-visible, non-dismissible disclaimer shown on every page while the
// storefront isn't ready to take real orders yet.
export default function TestModeNotice() {
  return (
    <div className="sticky top-0 z-[250] w-full bg-error text-on-error text-center px-4 py-2 flex items-center justify-center gap-2 shadow-sm">
      <span className="material-symbols-outlined text-[18px] shrink-0">warning</span>
      <p className="font-body-sm text-body-sm font-semibold">
        This website is currently in test mode. Any orders placed right now are not valid — please do not place an
        order. We are not responsible for any loss of funds.
      </p>
    </div>
  );
}
