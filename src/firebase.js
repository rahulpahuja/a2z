import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Feature flag: admin login (Firebase Auth) and the Realtime Database-backed
// admin/product/order features are disabled until real credentials are set
// in .env. The public storefront works fully without them. Re-enable by
// filling in .env and restarting `npm run dev`.
export const isFirebaseEnabled = Boolean(firebaseConfig.apiKey);

export const firebaseApp = isFirebaseEnabled ? initializeApp(firebaseConfig) : null;

export const auth = isFirebaseEnabled ? getAuth(firebaseApp) : null;
if (isFirebaseEnabled) {
  // Use the browser's language for reCAPTCHA / OTP SMS copy instead of a fixed locale.
  auth.useDeviceLanguage();
}

export const db = isFirebaseEnabled ? getDatabase(firebaseApp) : null;

// Headless/automated browsers (Puppeteer, Playwright, Selenium — what
// Netlify's post-deploy Lighthouse checks and preview screenshots run under)
// set navigator.webdriver and/or a "Headless" UA token. A real visitor never
// does. Skipping analytics for these keeps every automated post-deploy check
// from showing up in GA4 as a fake user session.
function isAutomatedBrowser() {
  if (typeof navigator === 'undefined') return false;
  if (navigator.webdriver) return true;
  return /HeadlessChrome|Lighthouse|Puppeteer|Playwright/i.test(navigator.userAgent || '');
}

// getAnalytics() requires an async support check (it fails in browsers without
// cookie/IndexedDB support, and can't run at all outside a browser), so it's
// exposed as a promise rather than a plain export like `auth`/`db` above.
export const analyticsPromise =
  isFirebaseEnabled && firebaseConfig.measurementId && !isAutomatedBrowser()
    ? isAnalyticsSupported().then((supported) => (supported ? getAnalytics(firebaseApp) : null))
    : Promise.resolve(null);
