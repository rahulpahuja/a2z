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
import {
  isMsg91Enabled,
  sendOtp as msg91SendOtp,
  retryOtp as msg91RetryOtp,
  verifyOtp as msg91VerifyOtp,
  resetOtpSession as resetMsg91OtpSession,
} from '../services/msg91Otp.js';

const AuthContext = createContext(null);

const MSG91_SESSION_KEY = 'a2z_msg91_session';
const MSG91_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function readMsg91Session() {
  try {
    const raw = localStorage.getItem(MSG91_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.verifiedAt || Date.now() - session.verifiedAt > MSG91_SESSION_TTL_MS) {
      localStorage.removeItem(MSG91_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function writeMsg91Session(session) {
  localStorage.setItem(MSG91_SESSION_KEY, JSON.stringify(session));
}

function clearMsg91Session() {
  localStorage.removeItem(MSG91_SESSION_KEY);
}

function msg91SessionToUser(session) {
  return {
    uid: `msg91:${session.identifier}`,
    phoneNumber: session.phoneNumber,
    displayName: null,
    email: null,
    provider: 'msg91',
  };
}

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
    const msg91Session = readMsg91Session();
    if (msg91Session) return msg91SessionToUser(msg91Session);
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
  const pendingIdentifierRef = useRef(null);

  useEffect(() => {
    if (!isFirebaseEnabled) return undefined;
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      // Don't let Firebase's initial null callback clobber a live MSG91 session.
      if (nextUser || !readMsg91Session()) {
        setUser(nextUser);
      }
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
    if (isMsg91Enabled) {
      const identifier = phoneNumber.replace(/^\+/, '');
      pendingIdentifierRef.current = phoneNumber;
      return msg91SendOtp(identifier, containerId);
    }

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
    if (isMsg91Enabled) {
      const data = await msg91VerifyOtp(code);
      const identifier = pendingIdentifierRef.current;
      const session = {
        identifier,
        phoneNumber: identifier,
        token: data?.message || null,
        verifiedAt: Date.now(),
      };
      writeMsg91Session(session);
      setUser(msg91SessionToUser(session));
      resetMsg91OtpSession();
      pendingIdentifierRef.current = null;
      return;
    }

    if (!confirmationRef.current) {
      throw new Error('Request a code before confirming.');
    }
    await confirmationRef.current.confirm(code);
    confirmationRef.current = null;
  };

  const retryOtp = async (channel = null) => {
    if (!isMsg91Enabled) {
      throw new Error('Resend is only available when MSG91 OTP is configured.');
    }
    return msg91RetryOtp(channel);
  };

  const resetPhoneFlow = () => {
    confirmationRef.current = null;
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
    pendingIdentifierRef.current = null;
    resetMsg91OtpSession();
  };

  const signOutUser = () => {
    const hadMsg91Session = Boolean(readMsg91Session());
    clearMsg91Session();
    if (isFirebaseEnabled) {
      if (hadMsg91Session) setUser(null);
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
      isMsg91Enabled,
      signInWithGoogle,
      sendOtp,
      confirmOtp,
      retryOtp,
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
