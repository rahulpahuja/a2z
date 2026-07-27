import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { CartProvider } from './context/CartContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ProfileProvider } from './context/ProfileContext.jsx'
import './theme.css'
import App from './App.jsx'

// A dynamic import() (e.g. the ffmpeg.wasm chunk used for video conversion)
// can 404 if this tab was already open from before a newer deploy replaced
// that chunk's hashed filename. Reload once to pick up the current build
// instead of leaving the user stuck on a dead "failed to fetch" error.
// Guarded with sessionStorage so a genuinely broken chunk can't reload-loop.
window.addEventListener('vite:preloadError', () => {
  const RELOAD_GUARD_KEY = 'a2z_preload_error_reloaded';
  if (!sessionStorage.getItem(RELOAD_GUARD_KEY)) {
    sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
    window.location.reload();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <CartProvider>
          <AuthProvider>
            <ProfileProvider>
              <App />
            </ProfileProvider>
          </AuthProvider>
        </CartProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
