import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const analytics = { logViewCart: vi.fn(), logCheckoutSignInPrompt: vi.fn(), logCheckoutSignInComplete: vi.fn(), logCheckoutSignInDismissed: vi.fn() };
let auth = { user: null, loading: false };
let completeLogin = () => {};
let closeModal = () => {};

vi.mock('../services/analytics.js', () => analytics);
vi.mock('../services/topNav.js', () => ({ DEFAULT_TOP_NAV_LINKS: [], topNavLinkToPath: () => '/', subscribeToTopNav: (cb) => { cb([]); return () => {}; } }));
vi.mock('../components/CartIconButton.jsx', () => ({ default: () => null }));
vi.mock('../components/ProfileButton.jsx', () => ({ default: () => null }));
vi.mock('../components/SiteFooter.jsx', () => ({ default: () => null }));
vi.mock('../components/MobileNavDrawer.jsx', () => ({ default: () => null }));
vi.mock('../components/ProductImage.jsx', () => ({ default: () => <i /> }));
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => auth }));
vi.mock('../components/AuthModal.jsx', () => ({
  default: ({ onClose }) => {
    closeModal = onClose;
    return <div role="dialog">sign-in dialog</div>;
  },
}));
vi.mock('../context/CartContext.jsx', () => ({
  formatCurrency: (n) => `₹${n}`,
  useCart: () => ({
    items: [{ id: 'l1', productId: 'p1', title: 'Jacket', price: 100, quantity: 1, image: '', color: 'Black', size: 'M' }],
    updateQuantity: vi.fn(), removeItem: vi.fn(), totals: { subtotal: 100, discount: 0, tax: 18, grandTotal: 118 },
    taxRatePercent: 18, appliedCoupon: null, applyCoupon: vi.fn(), removeCoupon: vi.fn(),
  }),
}));

const { default: CartPage } = await import('./CartPage.jsx');
let rerender;
const mount = () => {
  const ui = () => (
    <MemoryRouter initialEntries={['/cart']}>
      <Routes>
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout/shipping" element={<div>SHIPPING PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );
  const r = render(ui());
  rerender = () => r.rerender(ui());
  completeLogin = () => {
    auth = { user: { uid: 'u1' }, loading: false };
    rerender();
  };
};

beforeEach(() => {
  vi.useFakeTimers();
  Object.values(analytics).forEach((fn) => fn.mockReset());
  auth = { user: null, loading: false };
});
afterEach(() => vi.useRealTimers());

const proceed = () => fireEvent.click(screen.getByRole('button', { name: 'Proceed to Checkout' }));

describe('Proceed to Checkout', () => {
  it('goes straight to shipping when already signed in', () => {
    auth = { user: { uid: 'u1' }, loading: false };
    mount();
    proceed();
    expect(screen.getByText('SHIPPING PAGE')).toBeInTheDocument();
    expect(analytics.logCheckoutSignInPrompt).not.toHaveBeenCalled();
  });

  it('asks a signed-out visitor to sign in first, on the cart page, and tracks the prompt', () => {
    mount();
    proceed();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('SHIPPING PAGE')).toBeNull();
    expect(analytics.logCheckoutSignInPrompt).toHaveBeenCalledWith('cart');
    expect(analytics.logCheckoutSignInPrompt).toHaveBeenCalledTimes(1);
  });

  it('carries on to shipping once they have signed in, and tracks the completion', () => {
    mount();
    proceed();
    act(() => completeLogin());
    // The dialog closes itself after a successful sign-in; that must not count as giving up.
    act(() => closeModal());
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByText('SHIPPING PAGE')).toBeInTheDocument();
    expect(analytics.logCheckoutSignInComplete).toHaveBeenCalledWith('cart');
    expect(analytics.logCheckoutSignInDismissed).not.toHaveBeenCalled();
  });

  it('stays on the cart and tracks it when the dialog is dismissed without signing in', () => {
    mount();
    proceed();
    act(() => closeModal());
    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('SHIPPING PAGE')).toBeNull();
    expect(analytics.logCheckoutSignInDismissed).toHaveBeenCalledWith('cart');
  });

  it('asks again on the next attempt after dismissing', () => {
    mount();
    proceed();
    act(() => closeModal());
    act(() => vi.advanceTimersByTime(600));
    proceed();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(analytics.logCheckoutSignInPrompt).toHaveBeenCalledTimes(2);
  });

  it('waits for a returning customer\'s session to load instead of showing the dialog', () => {
    auth = { user: null, loading: true };
    mount();
    proceed();
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => { auth = { user: { uid: 'u1' }, loading: false }; rerender(); });
    expect(screen.getByText('SHIPPING PAGE')).toBeInTheDocument();
    expect(analytics.logCheckoutSignInPrompt).not.toHaveBeenCalled();
  });
});
