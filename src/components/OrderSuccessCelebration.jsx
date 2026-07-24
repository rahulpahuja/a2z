import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';

export default function OrderSuccessCelebration({ orderId, onClose }) {
  useEffect(() => {
    const duration = 1800;
    const end = Date.now() + duration;
    const colors = ['#ac2471', '#DCAE96', '#2e7d32', '#e9c46a'];
    // Default canvas-confetti z-index (100) sits behind this modal's
    // backdrop (z-[400]), which made the burst nearly invisible — push it
    // above everything.
    const zIndex = 500;

    confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 }, colors, zIndex });

    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 60, origin: { x: 0 }, colors, zIndex });
      confetti({ particleCount: 3, angle: 120, spread: 60, origin: { x: 1 }, colors, zIndex });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  return (
    <div className="fixed inset-0 z-[400] bg-on-surface/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl p-8 text-center relative">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <span className="material-symbols-outlined text-6xl text-primary mb-3">celebration</span>
        <h2 className="font-headline-md text-headline-md text-primary playfair mb-2">Order Placed!</h2>
        {orderId && (
          <p className="font-mono text-body-sm text-on-surface bg-surface-container-low inline-block px-3 py-1 rounded-lg mb-4">
            Order ID: {orderId}
          </p>
        )}
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-6">
          Congratulations — your order is confirmed. You can manage and track all your orders anytime from the{' '}
          <strong>My Orders</strong> section.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to="/orders"
            onClick={onClose}
            className="bg-primary text-on-primary font-label-caps text-label-caps py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Go to My Orders
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant font-label-caps text-label-caps py-2 uppercase tracking-wider hover:text-primary transition-colors"
          >
            Stay on This Page
          </button>
        </div>
      </div>
    </div>
  );
}
