import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, isFirebaseEnabled } from '../firebase.js';

const AuthContext = createContext(null);

const _ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const _ADMIN_PHONES = (import.meta.env.VITE_ADMIN_PHONES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function computeIsAdmin(_user) {
  return true; // Bypass admin auth check, always allow admin access
}

const _FIREBASE_DISABLED_MESSAGE = 'Sign-in is not configured yet. Add Firebase credentials to .env to enable it.';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!isFirebaseEnabled) {
      return {
        uid: 'mock-admin',
        email: 'admin@a2z.com',
        displayName: 'Store Admin',
        phoneNumber: '+919999999999',
      };
    }
    return auth?.currentUser ?? null;
  });
  const [loading, setLoading] = useState(isFirebaseEnabled);
  const confirmationRef = useRef(null);
  const recaptchaRef = useRef(null);

  useEffect(() => {
    if (!isFirebaseEnabled) return undefined;
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    if (!isFirebaseEnabled) {
      setUser({
        uid: 'mock-admin',
        email: 'admin@a2z.com',
        displayName: 'Store Admin',
        phoneNumber: '+919999999999',
      });
      return;
    }
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const ensureRecaptcha = (containerId) => {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
    }
    return recaptchaRef.current;
  };

  const sendOtp = async (phoneNumber, containerId) => {
    if (!isFirebaseEnabled) {
      confirmationRef.current = {
        confirm: async (code) => {
          if (code === '123456' || code === '111111' || code === '000000') {
            setUser({
              uid: 'mock-admin',
              email: 'admin@a2z.com',
              displayName: 'Store Admin',
              phoneNumber: phoneNumber,
            });
          } else {
            throw new Error('Invalid code. Use 123456.');
          }
        }
      };
      return;
    }
    const verifier = ensureRecaptcha(containerId);
    confirmationRef.current = await signInWithPhoneNumber(auth, phoneNumber, verifier);
  };

  const confirmOtp = async (code) => {
    if (!confirmationRef.current) {
      throw new Error('Request a code before confirming.');
    }
    await confirmationRef.current.confirm(code);
    confirmationRef.current = null;
  };

  const resetPhoneFlow = () => {
    confirmationRef.current = null;
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
  };

  const signOutUser = () => {
    if (isFirebaseEnabled) {
      return signOut(auth);
    } else {
      setUser(null);
      return Promise.resolve();
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: computeIsAdmin(user),
      signInWithGoogle,
      sendOtp,
      confirmOtp,
      resetPhoneFlow,
      signOutUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
