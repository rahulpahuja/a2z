import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.3-5l-6.6-5.4C29.7 35.4 27 36.3 24 36.3c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.9 39.7 16.4 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.6 5.4C41.4 35.6 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

export default function AuthModal({ onClose, dismissible = true }) {
  const { signInWithGoogle, sendOtp, confirmOtp, resetPhoneFlow } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('start'); // 'start' | 'otp'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setBusy(true);
    setError('');
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    const cleaned = phone.trim();

    if (cleaned.length !== 10 || !/^[6-9]/.test(cleaned)) {
      setError('Please enter a valid 10-digit mobile number (starts with 6, 7, 8, or 9).');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await sendOtp('+91' + cleaned, RECAPTCHA_CONTAINER_ID);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Could not send the code. Check the number and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await confirmOtp(otp.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleChangeNumber = () => {
    resetPhoneFlow();
    setOtp('');
    setStep('start');
  };

  return (
    <div className="fixed inset-0 z-[300] bg-on-surface/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl p-8 relative">
        {dismissible && (
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}

        <h1 className="font-headline-md text-headline-md text-primary playfair mb-2">Sign In</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
          Sign in with Google or your phone number.
        </p>

        {step === 'start' && (
          <div className="flex flex-col gap-5">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 border border-outline-variant rounded-lg py-3 font-label-caps text-label-caps text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-outline-variant" />
              <span className="font-label-caps text-label-caps text-on-surface-variant">OR</span>
              <div className="h-px flex-1 bg-outline-variant" />
            </div>

            <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
              <label className="block font-label-caps text-label-caps text-on-surface-variant" htmlFor="auth-phone">
                Phone Number
              </label>
              <input
                id="auth-phone"
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
              />
              <button
                type="submit"
                disabled={busy || !phone.trim()}
                className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Send OTP
              </button>
            </form>
          </div>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Enter the 6-digit code sent to <span className="text-on-surface font-semibold">{phone}</span>.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface tracking-[0.4em] text-center transition-colors"
            />
            <button
              type="submit"
              disabled={busy || otp.length !== 6}
              className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Verify &amp; Sign In
            </button>
            <button
              type="button"
              onClick={handleChangeNumber}
              className="font-body-sm text-body-sm text-primary hover:underline self-center mt-1"
            >
              Use a different number
            </button>
          </form>
        )}

        {error && <p className="font-body-sm text-body-sm text-error mt-4">{error}</p>}

        <div id={RECAPTCHA_CONTAINER_ID} />
      </div>
    </div>
  );
}
