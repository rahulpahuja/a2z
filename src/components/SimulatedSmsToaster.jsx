import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

export default function SimulatedSmsToaster() {
  const [activeSms, setActiveSms] = useState(null);
  const { trackSpecificOrder } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const checkNewSms = () => {
      const allSms = JSON.parse(localStorage.getItem('simulated_sms') || '[]');
      const unread = allSms.find((sms) => !sms.read);
      if (unread) {
        // Mark it as read so it doesn't trigger again
        const updated = allSms.map((s) => (s.id === unread.id ? { ...s, read: true } : s));
        localStorage.setItem('simulated_sms', JSON.stringify(updated));
        
        // Trigger popup
        setActiveSms(unread);
        
        // Auto dismiss after 10 seconds
        setTimeout(() => {
          setActiveSms(null);
        }, 10000);
      }
    };

    // Check on mount
    checkNewSms();

    // Listen to custom events (same window updates) and storage events (cross tab updates)
    window.addEventListener('new-sms', checkNewSms);
    window.addEventListener('storage', checkNewSms);
    
    // Also poll occasionally to capture quick updates
    const interval = setInterval(checkNewSms, 2000);

    return () => {
      window.removeEventListener('new-sms', checkNewSms);
      window.removeEventListener('storage', checkNewSms);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrackClick = () => {
    if (!activeSms) return;
    
    // Fetch the order from list
    const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const matchedOrder = localOrders.find((o) => o.id === activeSms.orderId);
    if (matchedOrder) {
      trackSpecificOrder(matchedOrder);
      navigate('/orders/tracking');
    }
    setActiveSms(null);
  };

  if (!activeSms) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[999] max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/50 p-4 flex flex-col gap-3 animate-slide-up hover:scale-[1.02] transition-transform duration-200">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-green-400 text-[20px]">sms</span>
          <span className="font-sans font-bold text-[11px] tracking-wider uppercase text-slate-300">
            Simulated SMS Dispatched
          </span>
        </div>
        <button
          onClick={() => setActiveSms(null)}
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>

      <div className="space-y-1 bg-slate-800/80 rounded-xl p-3 border border-slate-700/30">
        <p className="font-mono text-[10px] text-green-400 font-bold">
          TO: {activeSms.phone || '+91 XXXXX XXXXX'}
        </p>
        <p className="font-sans text-[12px] text-slate-100 leading-relaxed leading-normal mt-1">
          {activeSms.message}
        </p>
      </div>

      <button
        onClick={handleTrackClick}
        className="w-full flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-slate-950 font-bold font-label-caps text-[10px] uppercase py-2 px-3 rounded-lg transition-colors"
      >
        <span>Open Tracking Link</span>
        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
      </button>
    </div>
  );
}
