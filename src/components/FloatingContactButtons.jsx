import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext.jsx';
import { WHATSAPP_NUMBER, INSTAGRAM_HANDLE } from '../config/store.js';
import { buildWhatsAppLink } from '../utils/whatsapp.js';
import { logShare, logSelectContent } from '../services/analytics.js';
import WhatsAppIcon from './WhatsAppIcon.jsx';

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
  const navigate = useNavigate();
  const location = useLocation();
  // The Shots feed is a full-screen video player with its own close, like, share and Buy Now controls,
  // so these floating shortcuts (including the one back to Shots) would only sit on top of them.
  const hidden = location.pathname.replace(/\/$/, '') === '/shots';

  const handleWhatsApp = () => {
    if (!WHATSAPP_NUMBER) {
      showToast('WhatsApp number is not configured yet.');
      return;
    }
    logShare('whatsapp', 'floating_button');
    window.open(buildWhatsAppLink(WHATSAPP_NUMBER), '_blank', 'noopener,noreferrer');
  };

  const handleInstagram = () => {
    if (!INSTAGRAM_HANDLE) {
      showToast('Instagram link is not configured yet.');
      return;
    }
    logShare('instagram', 'floating_button');
    window.open(`https://instagram.com/${INSTAGRAM_HANDLE}`, '_blank', 'noopener,noreferrer');
  };

  if (hidden) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[150] flex flex-col gap-3">
      <button
        type="button"
        aria-label="Watch Shots"
        onClick={() => {
          logSelectContent('floating_button', 'shots');
          navigate('/shots');
        }}
        className="a2z-fab rounded-full bg-inverse-surface text-white flex flex-col items-center justify-center gap-0.5 shadow-lg hover:scale-105 transition-transform"
      >
        <span className="material-symbols-outlined a2z-fab-bolt" style={{ fontVariationSettings: "'FILL' 1" }}>
          bolt
        </span>
        <span className="a2z-fab-label font-bold uppercase tracking-wide leading-none">Shots</span>
      </button>
      <button
        type="button"
        aria-label="Chat on WhatsApp"
        onClick={handleWhatsApp}
        className="a2z-fab rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        <WhatsAppIcon />
      </button>
      <button
        type="button"
        aria-label="Visit Instagram"
        onClick={handleInstagram}
        className="a2z-fab rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        <InstagramIcon />
      </button>
    </div>
  );
}
