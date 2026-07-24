import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
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
