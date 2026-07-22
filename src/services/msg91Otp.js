// MSG91 OTP Widget integration (SMS/email OTP login for end users).
// Docs: https://docs.msg91.com/otp-widget — used here with `exposeMethods: true`
// so the widget never shows its own popup; our own UI in AuthModal.jsx drives it.

const WIDGET_SCRIPT_URL = 'https://verify.msg91.com/otp-provider.js';

const WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID || '';
const TOKEN_AUTH = import.meta.env.VITE_MSG91_TOKEN_AUTH || '';

// Feature flag, mirrors isFirebaseEnabled in firebase.js: leave the env vars
// blank to run without MSG91 (callers should fall back to another OTP path).
export const isMsg91Enabled = Boolean(WIDGET_ID && TOKEN_AUTH);

let widgetReadyPromise = null;
let lastReqId = null;

function normalizeError(error) {
  if (error instanceof Error) return error;
  const message = typeof error === 'string' ? error : error?.message || 'OTP request failed.';
  return new Error(message);
}

function buildConfiguration(captchaRenderId) {
  return {
    widgetId: WIDGET_ID,
    tokenAuth: TOKEN_AUTH,
    exposeMethods: true,
    captchaRenderId: captchaRenderId || '',
    success: () => {}, // per-call callbacks (sendOtp/verifyOtp) are used instead
    failure: () => {},
  };
}

// Injects the widget script (once) and calls initSendOTP. Resolves once
// window.sendOtp/retryOtp/verifyOtp are ready to use.
export function loadMsg91Widget({ captchaRenderId } = {}) {
  if (!isMsg91Enabled) {
    return Promise.reject(
      new Error('MSG91 OTP is not configured. Set VITE_MSG91_WIDGET_ID and VITE_MSG91_TOKEN_AUTH.')
    );
  }
  if (widgetReadyPromise) return widgetReadyPromise;

  widgetReadyPromise = new Promise((resolve, reject) => {
    const init = () => {
      try {
        window.initSendOTP(buildConfiguration(captchaRenderId));
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    if (typeof window.initSendOTP === 'function') {
      init();
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = WIDGET_SCRIPT_URL;
    script.async = true;
    script.onload = init;
    script.onerror = () => reject(new Error('Failed to load the MSG91 OTP widget script.'));
    document.body.appendChild(script);
  });

  return widgetReadyPromise;
}

// identifier: email or mobile number with country code, no leading '+'.
export function sendOtp(identifier, captchaRenderId) {
  return loadMsg91Widget({ captchaRenderId }).then(
    () =>
      new Promise((resolve, reject) => {
        window.sendOtp(
          identifier,
          (data) => {
            lastReqId = data?.message || data?.reqId || lastReqId;
            resolve(data);
          },
          (error) => reject(normalizeError(error))
        );
      })
  );
}

// channel: null (widget default), or '11' Sms | '4' Voice | '3' Email | '12' WhatsApp.
export function retryOtp(channel = null, reqId = lastReqId) {
  return loadMsg91Widget().then(
    () =>
      new Promise((resolve, reject) => {
        window.retryOtp(
          channel,
          (data) => resolve(data),
          (error) => reject(normalizeError(error)),
          reqId
        );
      })
  );
}

export function verifyOtp(otp, reqId = lastReqId) {
  return loadMsg91Widget().then(
    () =>
      new Promise((resolve, reject) => {
        window.verifyOtp(
          otp,
          (data) => resolve(data),
          (error) => reject(normalizeError(error)),
          reqId
        );
      })
  );
}

export function getWidgetData() {
  return typeof window.getWidgetData === 'function' ? window.getWidgetData() : null;
}

export function isCaptchaVerified() {
  return typeof window.isCaptchaVerified === 'function' ? window.isCaptchaVerified() : false;
}

export function getLastReqId() {
  return lastReqId;
}

// Call when the user abandons or restarts the OTP flow (e.g. "use a different number").
export function resetOtpSession() {
  lastReqId = null;
}
