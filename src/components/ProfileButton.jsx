import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthModal from './AuthModal.jsx';

function displayName(user) {
  return user.displayName || user.email || user.phoneNumber || 'Account';
}

export default function ProfileButton({ className = '', iconClassName = 'material-symbols-outlined' }) {
  const { user, isAdmin, signOutUser } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) {
    return (
      <>
        <button
          type="button"
          aria-label="Sign In"
          className={className}
          onClick={() => setModalOpen(true)}
        >
          <span className={iconClassName}>person</span>
        </button>
        {modalOpen && <AuthModal onClose={() => setModalOpen(false)} />}
      </>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Account"
        className={className}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className={iconClassName} style={{ fontVariationSettings: "'FILL' 1" }}>
          person
        </span>
      </button>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-[290] cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-xl shadow-xl border border-outline-variant py-2 z-[295]">
            <p className="px-4 py-2 font-body-sm text-body-sm text-on-surface truncate border-b border-outline-variant/60">
              {displayName(user)}
            </p>
            {isAdmin && (
              <Link
                to="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 font-body-sm text-body-sm text-on-surface hover:bg-surface-container transition-colors"
              >
                Admin Dashboard
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                signOutUser();
              }}
              className="block w-full text-left px-4 py-2 font-body-sm text-body-sm text-error hover:bg-surface-container transition-colors"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
