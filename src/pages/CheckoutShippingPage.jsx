import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, formatCurrency } from '../context/CartContext.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { subscribeToReferrers } from '../services/referrers.js';
import { INDIAN_STATES_AND_UT, STATE_CITIES } from '../data/indiaData.js';

const inputClassName =
  'w-full bg-surface-container-lowest border-b border-tertiary/30 focus:border-primary focus:ring-0 px-0 py-3 font-body-lg text-body-lg text-on-surface transition-colors duration-200';

function TextField({ id, label, placeholder, type = 'text', value, onChange, error }) {
  return (
    <div>
      <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor={id}>
        {label}
      </label>
      <input
        className={`${inputClassName} ${error ? 'border-error! focus:border-error!' : ''}`}
        id={id}
        name={id}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={onChange}
      />
      {error && <p className="text-error text-xs mt-1 font-body-sm">{error}</p>}
    </div>
  );
}

export default function CheckoutShippingPage() {
  const { items: cartItems, setShippingDetails } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    gstNumber: '',
    referredBy: '',
  });
  const [referrers, setReferrers] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const unsubscribe = subscribeToReferrers((rows) => setReferrers(rows));
    return unsubscribe;
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setForm((prev) => ({ ...prev, [name]: digits }));
      if (errors.phone) {
        setErrors((prev) => ({ ...prev, phone: '' }));
      }
    } else if (name === 'state') {
      setForm((prev) => ({ ...prev, state: value, city: '' }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.18;
  const grandTotal = subtotal + tax;

  const handleSubmit = (event) => {
    event.preventDefault();
    const phoneVal = form.phone;
    const errorsMap = {};

    if (!phoneVal) {
      errorsMap.phone = 'Phone number is required';
    } else if (phoneVal.length !== 10) {
      errorsMap.phone = 'Phone number must be exactly 10 digits';
    } else if (!/^[6-9]/.test(phoneVal)) {
      errorsMap.phone = 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9';
    }

    if (Object.keys(errorsMap).length > 0) {
      setErrors(errorsMap);
      return;
    }

    setShippingDetails(form);
    navigate('/checkout/payment');
  };

  return (
    <>
      {/* TopNavBar: Suppressed because this is a transactional flow (Checkout) */}
      <header className="w-full px-margin-desktop py-4 bg-surface border-b border-surface-variant flex justify-center items-center">
        <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
          A2Z Collection
        </Link>
      </header>
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        {/* Progress Indicator */}
        <div className="mb-12 max-w-3xl mx-auto">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-surface-variant z-0"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/3 h-0.5 bg-primary z-0"></div>
            <div className="relative z-10 flex flex-col items-center bg-background px-4">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold font-body-sm text-body-sm mb-2 shadow-sm">
                <span className="material-symbols-outlined text-sm">check</span>
              </div>
              <span className="font-label-caps text-label-caps text-primary">Cart</span>
            </div>
            <div className="relative z-10 flex flex-col items-center bg-background px-4">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold font-body-sm text-body-sm mb-2 shadow-sm">
                2
              </div>
              <span className="font-label-caps text-label-caps text-primary">Shipping</span>
            </div>
            <div className="relative z-10 flex flex-col items-center bg-background px-4">
              <div className="w-8 h-8 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center font-bold font-body-sm text-body-sm mb-2">
                3
              </div>
              <span className="font-label-caps text-label-caps text-on-surface-variant">Payment</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left Panel: Shipping Form */}
          <div className="lg:col-span-7 xl:col-span-8">
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg mb-8 text-on-surface">
              Shipping Address
            </h1>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextField
                  id="firstName"
                  label="First Name"
                  placeholder="Enter your first name"
                  value={form.firstName}
                  onChange={handleChange}
                />
                <TextField
                  id="lastName"
                  label="Last Name"
                  placeholder="Enter your last name"
                  value={form.lastName}
                  onChange={handleChange}
                />
              </div>
              <TextField
                id="address"
                label="Address"
                placeholder="Street address or P.O. Box"
                value={form.address}
                onChange={handleChange}
              />
              <TextField
                id="apartment"
                label="Apartment, suite, etc. (optional)"
                placeholder="Apartment, suite, unit, building, floor, etc."
                value={form.apartment}
                onChange={handleChange}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="md:col-span-1">
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="state">
                    State / Province
                  </label>
                  <select
                    className={`${inputClassName} appearance-none`}
                    id="state"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                  >
                    <option disabled value="">
                      Select State
                    </option>
                    {INDIAN_STATES_AND_UT.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="city">
                    City
                  </label>
                  <select
                    className={`${inputClassName} appearance-none`}
                    id="city"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    disabled={!form.state}
                  >
                    <option disabled value="">
                      {form.state ? 'Select City' : 'Select State First'}
                    </option>
                    {form.state &&
                      STATE_CITIES[form.state]?.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <TextField
                    id="zip"
                    label="Postal / Zip Code"
                    placeholder="Zip Code"
                    value={form.zip}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <TextField
                id="phone"
                label="Phone"
                placeholder="Mobile number for delivery updates"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                error={errors.phone}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextField
                  id="gstNumber"
                  label="GST Number (optional)"
                  placeholder="For a GST invoice, e.g. 27ABCDE1234F1Z5"
                  value={form.gstNumber}
                  onChange={handleChange}
                />
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="referredBy">
                    Referred By (optional)
                  </label>
                  <select
                    className={`${inputClassName} appearance-none`}
                    id="referredBy"
                    name="referredBy"
                    value={form.referredBy}
                    onChange={handleChange}
                  >
                    <option value="">None</option>
                    {referrers.map((referrer) => (
                      <option key={referrer.id} value={referrer.name}>
                        {referrer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pt-6 flex flex-col-reverse md:flex-row items-center gap-4">
                <Link
                  to="/cart"
                  className="w-full md:w-auto text-center border border-tertiary/30 text-on-surface font-label-caps text-label-caps uppercase px-8 py-4 rounded-[12px] hover:border-primary hover:text-primary transition-colors duration-200"
                >
                  Back to Cart
                </Link>
                <button
                  className="w-full md:w-auto bg-primary text-on-primary font-label-caps text-label-caps uppercase px-8 py-4 rounded-[12px] hover:bg-primary/90 transition-colors duration-200 shadow-[0px_4px_10px_rgba(172,36,113,0.2)]"
                  type="submit"
                >
                  Continue to Payment
                </button>
              </div>
            </form>
          </div>
          {/* Right Panel: Order Summary (Sticky) */}
          <div className="lg:col-span-5 xl:col-span-4 mt-12 lg:mt-0">
            <div className="sticky top-24 bg-surface-container-low rounded-xl p-6 lg:p-8 border border-tertiary/10 shadow-[0px_10px_30px_rgba(172,36,113,0.05)]">
              <h2 className="font-headline-md-mobile md:font-headline-md text-headline-md-mobile md:text-headline-md mb-6 text-on-surface">
                Order Summary
              </h2>
              {/* Items */}
              <div className="space-y-6 mb-8">
                {cartItems.length === 0 ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Your cart is empty.</p>
                ) : (
                  cartItems.map((item) => (
                    <div className="flex gap-4" key={item.id}>
                      <div className="w-20 h-24 flex-shrink-0 rounded-[16px] overflow-hidden bg-surface-container-highest">
                        <ProductImage
                          className="w-full h-full object-cover"
                          data-alt={item.alt}
                          src={item.image}
                          alt={item.title}
                        />
                      </div>
                      <div className="flex flex-col justify-center flex-grow">
                        <h3 className="font-title-sm text-title-sm text-on-surface line-clamp-2 mb-1">{item.title}</h3>
                        {item.size ? (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-block bg-tertiary text-on-tertiary font-label-caps text-[10px] px-2 py-1 rounded-full uppercase tracking-wider">
                              {item.size}
                            </span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">Qty: {item.quantity}</span>
                          </div>
                        ) : (
                          <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">Qty: {item.quantity}</p>
                        )}
                        <p className="font-price-display text-price-display text-on-surface">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Divider */}
              <div className="h-px bg-surface-variant w-full mb-6"></div>
              {/* Totals */}
              <div className="space-y-4 mb-6 font-body-sm text-body-sm">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Tax (18%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              </div>
              {/* Divider */}
              <div className="h-px bg-surface-variant w-full mb-6"></div>
              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="font-title-sm text-title-sm text-on-surface">Total</span>
                <span className="font-price-display text-price-display text-primary text-2xl">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Footer: Suppressed on transactional pages for a focused checkout flow. */}
    </>
  );
}
