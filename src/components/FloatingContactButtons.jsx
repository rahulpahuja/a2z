import { useToast } from '../context/ToastContext.jsx';
import { WHATSAPP_NUMBER, INSTAGRAM_HANDLE } from '../config/store.js';

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.38a9.9 9.9 0 0 0 4.76 1.21h.01c5.46 0 9.9-4.45 9.9-9.92C21.96 6.45 17.5 2 12.04 2Zm0 18.14h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.2 8.2 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.26-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.55-3.7 8.23-8.25 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.24-.64.81-.79.98-.14.17-.29.19-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.24-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.42h-.48c-.16 0-.42.06-.64.31-.22.25-.85.83-.85 2.02s.87 2.35.99 2.51c.12.16 1.71 2.6 4.14 3.65.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.14-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function FloatingContactButtons() {
  const { showToast } = useToast();

  const handleWhatsApp = () => {
    if (!WHATSAPP_NUMBER) {
      showToast('WhatsApp number is not configured yet.');
      return;
    }
    window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank', 'noopener,noreferrer');
  };

  const handleInstagram = () => {
    if (!INSTAGRAM_HANDLE) {
      showToast('Instagram link is not configured yet.');
      return;
    }
    window.open(`https://instagram.com/${INSTAGRAM_HANDLE}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[150] flex flex-col gap-3">
      <button
        type="button"
        aria-label="Chat on WhatsApp"
        onClick={handleWhatsApp}
        className="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        <WhatsAppIcon />
      </button>
      <button
        type="button"
        aria-label="Visit Instagram"
        onClick={handleInstagram}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        <InstagramIcon />
      </button>
    </div>
  );
}
