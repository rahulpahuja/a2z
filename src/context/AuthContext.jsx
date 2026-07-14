import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase.js';

const AuthContext = createContext(null);

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_PHONES = (import.meta.env.VITE_ADMIN_PHONES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function computeIsAdmin(user) {
  if (!user) return false;
  const email = user.email?.toLowerCase();
  const phone = user.phoneNumber;
  return (!!email && ADMIN_EMAILS.includes(email)) || (!!phone && ADMIN_PHONES.includes(phone));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => auth.currentUser);
  const [loading, setLoading] = useState(true);
  const confirmationRef = useRef(null);
  const recaptchaRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const ensureRecaptcha = (containerId) => {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
    }
    return recaptchaRef.current;
  };

  const sendOtp = async (phoneNumber, containerId) => {
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

  const signOutUser = () => signOut(auth);

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
