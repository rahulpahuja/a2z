import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { loadMsg91Widget } from '../services/msg91Otp.js';
import { OTP_WIDGET_CONTAINER_ID, OTP_WIDGET_HOST_ID } from './OtpCaptchaHost.jsx';

export default function AuthModal({ onClose, dismissible = true }) {
  const { sendOtp, confirmOtp, retryOtp, resetPhoneFlow, isMsg91Enabled } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('start'); // 'start' | 'otp'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const captchaSlotRef = useRef(null);
  const relocatedNodeRef = useRef(null);

  // Initialize the MSG91 widget (and render its captcha checkbox into
  // OTP_WIDGET_CONTAINER_ID) as soon as the modal opens, so the captcha is
  // ready before the user finishes typing their phone number — not only
  // after they click "Send OTP".
  useEffect(() => {
    if (!isMsg91Enabled) return;
    loadMsg91Widget({ captchaRenderId: OTP_WIDGET_CONTAINER_ID }).catch(() => {
      // Surfaced properly later when sendOtp() is actually called.
    });
  }, [isMsg91Enabled]);

  // Physically move the persistent captcha DOM node (owned by OtpCaptchaHost,
  // mounted once at the app root) into this modal while it's open, and move
  // it back on close — never destroy/recreate it, so a rendered captcha
  // survives the modal being closed and reopened. useLayoutEffect's cleanup
  // runs synchronously before React removes this modal's DOM, so the move-out
  // always completes before the node would otherwise be torn down with it.
  useLayoutEffect(() => {
    const node = document.getElementById(OTP_WIDGET_CONTAINER_ID);
    const slot = captchaSlotRef.current;
    if (!node || !slot) return undefined;
    slot.appendChild(node);
    relocatedNodeRef.current = node;

    return () => {
      const host = document.getElementById(OTP_WIDGET_HOST_ID);
      if (host && relocatedNodeRef.current) {
        host.appendChild(relocatedNodeRef.current);
      }
      relocatedNodeRef.current = null;
    };
  }, []);

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
      await sendOtp('+91' + cleaned, OTP_WIDGET_CONTAINER_ID);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Could not send the code. Check the number and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleResendOtp = async () => {
    setBusy(true);
    setError('');
    setResendMessage('');
    try {
      await retryOtp(null);
      setResendMessage('Code resent.');
    } catch (err) {
      setError(err.message || 'Could not resend the code.');
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
    setResendMessage('');
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
          Sign in with your phone number.
        </p>

        {step === 'start' && (
          <div className="flex flex-col gap-5">
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
            <div className="flex items-center justify-center gap-4 mt-1">
              {isMsg91Enabled && (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={busy}
                  className="font-body-sm text-body-sm text-primary hover:underline disabled:opacity-50"
                >
                  Resend code
                </button>
              )}
              <button
                type="button"
                onClick={handleChangeNumber}
                className="font-body-sm text-body-sm text-primary hover:underline"
              >
                Use a different number
              </button>
            </div>
            {resendMessage && (
              <p className="font-body-sm text-body-sm text-secondary text-center">{resendMessage}</p>
            )}
          </form>
        )}

        {error && <p className="font-body-sm text-body-sm text-error mt-4">{error}</p>}

        <div ref={captchaSlotRef} />
      </div>
    </div>
  );
}
