import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const setShippingDetails = vi.fn();
const saveAddress = vi.fn();
const analytics = {
  logAnalyticsEvent: vi.fn(), logBeginCheckout: vi.fn(), logAddShippingInfo: vi.fn(), logCheckoutAddressChoice: vi.fn(),
  logCheckoutAddressEdit: vi.fn(), logCheckoutAddressSave: vi.fn(), logCheckoutAddressSaveToggle: vi.fn(),
};
let addresses;

vi.mock('../services/analytics.js', () => analytics);
vi.mock('../services/referrers.js', () => ({ subscribeToReferrers: (cb) => { cb([]); return () => {}; } }));
vi.mock('../components/ProductImage.jsx', () => ({ default: () => <i /> }));
vi.mock('../components/BrandName.jsx', () => ({ default: () => <span>brand</span> }));
vi.mock('../components/AuthModal.jsx', () => ({ default: () => <div>auth-modal</div> }));
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => ({ user: { uid: 'u1' }, loading: false }) }));
vi.mock('../context/ProfileContext.jsx', () => ({ useProfile: () => ({ profile: { displayName: '', addresses }, saveAddress }) }));
vi.mock('../context/CartContext.jsx', () => ({
  formatCurrency: (n) => `₹${n}`,
  useCart: () => ({ items: [{ id: 'l1', title: 'Jacket', price: 100, quantity: 1, image: '' }], setShippingDetails, taxRatePercent: 18, totals: { subtotal: 100, discount: 0, tax: 18, grandTotal: 118 }, appliedCoupon: null }),
}));

const { default: CheckoutShippingPage } = await import('./CheckoutShippingPage.jsx');
const home = { id: 'a1', label: 'Home', firstName: 'Priya', lastName: 'Shah', address: '12 MG Road', apartment: '', city: 'Indore', state: 'MP', zip: '452001', phone: '9876543210' };
const work = { id: 'a2', label: 'Work', firstName: 'Priya', lastName: 'Shah', address: '5 Tech Park', apartment: '', city: 'Pune', state: 'MH', zip: '411001', phone: '9876543210' };

const view = () =>
  render(
    <MemoryRouter initialEntries={['/checkout/shipping']}>
      <Routes>
        <Route path="/checkout/shipping" element={<CheckoutShippingPage />} />
        <Route path="/checkout/payment" element={<div>PAYMENT PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );
const submit = (container) => fireEvent.submit(container.querySelector('form'));
const field = (id, value) => fireEvent.change(document.getElementById(id), { target: { name: id, value } });
const fillNewAddress = () => {
  field('firstName', 'Asha');
  field('lastName', 'Rao');
  field('address', '9 Lake View');
  const state = document.getElementById('state');
  field('state', state.options[1].value);
  const city = document.getElementById('city');
  field('city', city.options[1]?.value ?? '');
  field('zip', '560001');
  field('phone', '9123456780');
};

beforeEach(() => {
  Object.values(analytics).forEach((fn) => fn.mockReset());
  setShippingDetails.mockReset();
  saveAddress.mockReset();
  addresses = [home, work];
});

describe('saved addresses', () => {
  it('preselects the first saved address and hides the form, so checkout is one tap', () => {
    view();
    expect(screen.getByRole('radio', { name: /Home/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Work/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Deliver to a new address' })).not.toBeChecked();
    expect(document.getElementById('firstName')).toBeNull();
    expect(screen.queryByLabelText(/Save this address for next time/)).toBeNull();
    expect(analytics.logCheckoutAddressChoice).toHaveBeenCalledWith('saved', 2);
  });

  it('continues to payment with the saved address and saves nothing new', () => {
    const { container } = view();
    submit(container);
    expect(setShippingDetails).toHaveBeenCalledWith(expect.objectContaining({ address: '12 MG Road', zip: '452001', phone: '9876543210' }));
    expect(screen.getByText('PAYMENT PAGE')).toBeInTheDocument();
    expect(saveAddress).not.toHaveBeenCalled();
    expect(analytics.logAddShippingInfo).toHaveBeenCalled();
  });

  it('delivers to another saved address when it is chosen', () => {
    const { container } = view();
    fireEvent.click(screen.getByRole('radio', { name: /Work/ }));
    submit(container);
    expect(setShippingDetails).toHaveBeenCalledWith(expect.objectContaining({ address: '5 Tech Park', zip: '411001' }));
  });

  it('lets the customer edit a saved address, and only updates it if they say so', () => {
    const { container } = view();
    fireEvent.click(screen.getByRole('button', { name: /Edit this address/ }));
    expect(analytics.logCheckoutAddressEdit).toHaveBeenCalled();
    const update = screen.getByLabelText('Update my saved address with these changes');
    expect(update).not.toBeChecked();
    field('address', '12 MG Road, Block B');
    submit(container);
    expect(saveAddress).not.toHaveBeenCalled();
    expect(analytics.logCheckoutAddressSave).toHaveBeenCalledWith('not_saved');
  });

  it('updates the saved address in place when the box is ticked', () => {
    const { container } = view();
    fireEvent.click(screen.getByRole('button', { name: /Edit this address/ }));
    fireEvent.click(screen.getByLabelText('Update my saved address with these changes'));
    expect(analytics.logCheckoutAddressSaveToggle).toHaveBeenCalledWith(true, 'update');
    field('address', '12 MG Road, Block B');
    submit(container);
    expect(saveAddress).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1', label: 'Home', address: '12 MG Road, Block B' }));
    expect(analytics.logCheckoutAddressSave).toHaveBeenCalledWith('updated');
  });

  it('opens the form with the problem showing when a saved address is incomplete', () => {
    addresses = [{ ...home, phone: '' }];
    const { container } = view();
    expect(document.getElementById('phone')).toBeNull();
    submit(container);
    expect(document.getElementById('phone')).toBeInTheDocument();
    expect(screen.getByText('Phone number is required')).toBeInTheDocument();
    expect(screen.queryByText('PAYMENT PAGE')).toBeNull();
  });
});

describe('a new address', () => {
  it('shows an empty form with "save this address" ticked by default', () => {
    view();
    fireEvent.click(screen.getByRole('radio', { name: 'Deliver to a new address' }));
    expect(document.getElementById('firstName')).toHaveValue('');
    expect(document.getElementById('address')).toHaveValue('');
    expect(screen.getByLabelText('Save this address for next time')).toBeChecked();
    expect(analytics.logCheckoutAddressChoice).toHaveBeenLastCalledWith('new', 2);
  });

  it('saves it for next time, with the next free label', () => {
    const { container } = view();
    fireEvent.click(screen.getByRole('radio', { name: 'Deliver to a new address' }));
    fillNewAddress();
    submit(container);
    expect(setShippingDetails).toHaveBeenCalledWith(expect.objectContaining({ address: '9 Lake View', zip: '560001' }));
    expect(saveAddress).toHaveBeenCalledWith(expect.objectContaining({ address: '9 Lake View', label: 'Address 3' }));
    expect(saveAddress.mock.calls[0][0].id).toBeUndefined();
    expect(analytics.logCheckoutAddressSave).toHaveBeenCalledWith('saved_new');
    expect(screen.getByText('PAYMENT PAGE')).toBeInTheDocument();
  });

  it('delivers without saving when the box is unticked', () => {
    const { container } = view();
    fireEvent.click(screen.getByRole('radio', { name: 'Deliver to a new address' }));
    fillNewAddress();
    fireEvent.click(screen.getByLabelText('Save this address for next time'));
    expect(analytics.logCheckoutAddressSaveToggle).toHaveBeenCalledWith(false, 'new');
    submit(container);
    expect(saveAddress).not.toHaveBeenCalled();
    expect(analytics.logCheckoutAddressSave).toHaveBeenCalledWith('not_saved');
    expect(screen.getByText('PAYMENT PAGE')).toBeInTheDocument();
  });

  it('does not save a duplicate of an address that is already saved', () => {
    const { container } = view();
    fireEvent.click(screen.getByRole('radio', { name: 'Deliver to a new address' }));
    field('firstName', 'Someone');
    field('address', '12 mg road');
    const state = document.getElementById('state');
    field('state', [...state.options].find((o) => o.value === 'MP' || o.textContent === 'MP')?.value ?? state.options[1].value);
    field('zip', '452001');
    field('phone', '9876543210');
    field('city', 'Indore');
    submit(container);
    expect(saveAddress).not.toHaveBeenCalled();
    expect(analytics.logCheckoutAddressSave).toHaveBeenLastCalledWith('duplicate_skipped');
  });
});

describe('first-time customer', () => {
  it('goes straight to the form, with no address options, and saves the address as Home', () => {
    addresses = [];
    const { container } = view();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByLabelText('Save this address for next time')).toBeChecked();
    fillNewAddress();
    submit(container);
    expect(saveAddress).toHaveBeenCalledWith(expect.objectContaining({ label: 'Home' }));
  });
});
