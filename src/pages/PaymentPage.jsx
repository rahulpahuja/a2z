import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, formatCurrency } from '../context/CartContext.jsx';
import { getActivePaymentGateway } from '../services/paymentGateway.js';

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: 'payments' },
  { id: 'card', label: 'Credit / Debit Card', icon: 'credit_card' },
  { id: 'upi', label: 'UPI', icon: 'qr_code_2' },
];

export default function PaymentPage() {
  const { items: cartItems, placeOrder } = useCart();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [activeGateway, setActiveGateway] = useState(null);

  useEffect(() => {
    getActivePaymentGateway().then((gateway) => {
      if (gateway) {
        setActiveGateway(gateway);
      }
    });
  }, []);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  const handlePlaceOrder = () => {
    let methodLabel = PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label ?? paymentMethod;
    if (paymentMethod !== 'cod' && activeGateway) {
      methodLabel = `${methodLabel} (via ${activeGateway.name})`;
    }
    placeOrder({ paymentMethod: methodLabel, placedAt: new Date().toISOString() });
    navigate('/orders/tracking');
  };

  return (
    <>
      <header className="w-full px-margin-mobile md:px-margin-desktop py-4 bg-surface border-b border-surface-variant flex justify-center items-center">
        <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
          A2Z Collection
        </Link>
      </header>
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        {/* Progress Indicator */}
        <div className="mb-12 max-w-3xl mx-auto">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-primary z-0"></div>
            <div className="relative z-10 flex flex-col items-center bg-background px-4">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold font-body-sm text-body-sm mb-2 shadow-sm">
                <span className="material-symbols-outlined text-sm">check</span>
              </div>
              <span className="font-label-caps text-label-caps text-primary">Cart</span>
            </div>
            <div className="relative z-10 flex flex-col items-center bg-background px-4">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold font-body-sm text-body-sm mb-2 shadow-sm">
                <span className="material-symbols-outlined text-sm">check</span>
              </div>
              <span className="font-label-caps text-label-caps text-primary">Shipping</span>
            </div>
            <div className="relative z-10 flex flex-col items-center bg-background px-4">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold font-body-sm text-body-sm mb-2 shadow-sm">
                3
              </div>
              <span className="font-label-caps text-label-caps text-primary">Payment</span>
            </div>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <p className="font-body-lg text-body-lg text-on-surface-variant">Your cart is empty — nothing to pay for yet.</p>
            <Link to="/products" className="bg-primary text-on-primary font-label-caps text-label-caps px-8 py-4 rounded-[12px] uppercase tracking-widest">
              Browse Products
            </Link>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left Panel: Payment Method */}
          <div className="lg:col-span-7 xl:col-span-8">
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg mb-8 text-on-surface">
              Payment Method
            </h1>
            <div className="space-y-4">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.id}
                  className={`flex items-center gap-4 border rounded-[12px] px-6 py-4 cursor-pointer transition-colors ${
                    paymentMethod === method.id ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-primary'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                    className="w-5 h-5 text-primary focus:ring-primary"
                  />
                  <span className="material-symbols-outlined text-on-surface-variant">{method.icon}</span>
                  <span className="font-title-sm text-title-sm text-on-surface">{method.label}</span>
                </label>
              ))}
            </div>

            {paymentMethod !== 'cod' && activeGateway && (
              <div className="mt-6 p-5 bg-primary/10 rounded-xl border border-primary/20 flex flex-col gap-3 shadow-sm animate-fade-in">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[24px]">verified_user</span>
                  <div>
                    <h3 className="font-semibold text-on-surface text-[14px]">
                      Secure Checkout via {activeGateway.name}
                    </h3>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Payments are processed securely using your registered gateway configuration in Firebase.
                    </p>
                  </div>
                </div>
                
                {/* Gateway config indicator */}
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-on-surface-variant bg-surface-container border border-outline-variant/30 rounded-lg p-2.5 w-fit">
                  <span className="font-sans font-bold text-outline mr-1">GATEWAY KEY:</span>
                  {activeGateway.apiKey.substring(0, 8)}...{activeGateway.apiKey.substring(activeGateway.apiKey.length - 4)}
                </div>

                {/* Simulated payment inputs for credit card */}
                {paymentMethod === 'card' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 font-body-sm">
                    <input
                      type="text"
                      placeholder="Card Number"
                      className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:border-primary focus:ring-0 text-on-surface"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="w-1/2 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:border-primary focus:ring-0 text-on-surface"
                      />
                      <input
                        type="password"
                        placeholder="CVV"
                        className="w-1/2 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:border-primary focus:ring-0 text-on-surface"
                      />
                    </div>
                  </div>
                )}

                {/* Simulated payment inputs for UPI */}
                {paymentMethod === 'upi' && (
                  <div className="mt-2 font-body-sm flex gap-3 max-w-sm">
                    <input
                      type="text"
                      placeholder="e.g. mobile@upi"
                      className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:border-primary focus:ring-0 text-on-surface"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="pt-8">
              <button
                onClick={handlePlaceOrder}
                className="w-full md:w-auto bg-primary text-on-primary font-label-caps text-label-caps uppercase px-8 py-4 rounded-[12px] hover:bg-primary/90 transition-colors duration-200 shadow-[0px_4px_10px_rgba(172,36,113,0.2)]"
              >
                Place Order
              </button>
            </div>
          </div>

          {/* Right Panel: Order Summary */}
          <div className="lg:col-span-5 xl:col-span-4 mt-12 lg:mt-0">
            <div className="sticky top-24 bg-surface-container-low rounded-xl p-6 lg:p-8 border border-tertiary/10 shadow-[0px_10px_30px_rgba(172,36,113,0.05)]">
              <h2 className="font-headline-md-mobile md:font-headline-md text-headline-md-mobile md:text-headline-md mb-6 text-on-surface">
                Order Summary
              </h2>
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
              <div className="h-px bg-surface-variant w-full mb-6"></div>
              <div className="flex justify-between items-center">
                <span className="font-title-sm text-title-sm text-on-surface">Total</span>
                <span className="font-price-display text-price-display text-primary text-2xl">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
        )}
      </main>
    </>
  );
}
