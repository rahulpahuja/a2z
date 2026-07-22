import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';

const ProfileContext = createContext(null);

const PROFILE_KEY_PREFIX = 'a2z_profile_';

const EMPTY_PROFILE = { displayName: '', addresses: [] };

function keyFor(uid) {
  return `${PROFILE_KEY_PREFIX}${uid}`;
}

function readProfile(uid) {
  if (!uid) return EMPTY_PROFILE;
  try {
    const raw = localStorage.getItem(keyFor(uid));
    return raw ? { ...EMPTY_PROFILE, ...JSON.parse(raw) } : EMPTY_PROFILE;
  } catch {
    return EMPTY_PROFILE;
  }
}

function writeProfile(uid, profile) {
  if (!uid) return;
  try {
    localStorage.setItem(keyFor(uid), JSON.stringify(profile));
  } catch {
    // ignore storage failures (e.g. private mode)
  }
}

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.uid || null;
  const [profile, setProfile] = useState(() => readProfile(uid));

  useEffect(() => {
    setProfile(readProfile(uid));
  }, [uid]);

  const updateProfile = (updater) => {
    setProfile((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      writeProfile(uid, next);
      return next;
    });
  };

  const setDisplayName = (displayName) => updateProfile((prev) => ({ ...prev, displayName }));

  const saveAddress = (address) =>
    updateProfile((prev) => {
      const addresses = prev.addresses || [];
      const id = address.id || `addr-${addresses.length + 1}-${Math.random().toString(36).slice(2, 8)}`;
      const nextAddress = { ...address, id };
      const existingIndex = addresses.findIndex((a) => a.id === id);
      const nextAddresses =
        existingIndex >= 0
          ? addresses.map((a, i) => (i === existingIndex ? nextAddress : a))
          : [...addresses, nextAddress];
      return { ...prev, addresses: nextAddresses };
    });

  const removeAddress = (addressId) =>
    updateProfile((prev) => ({
      ...prev,
      addresses: (prev.addresses || []).filter((a) => a.id !== addressId),
    }));

  const value = useMemo(
    () => ({ profile, setDisplayName, saveAddress, removeAddress }),
    [profile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider');
  return ctx;
}
