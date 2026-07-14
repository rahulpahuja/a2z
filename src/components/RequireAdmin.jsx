import { useAuth } from '../context/AuthContext.jsx';
import { isFirebaseEnabled } from '../firebase.js';
import AuthModal from './AuthModal.jsx';

export default function RequireAdmin({ children }) {
  const { user, isAdmin, loading, signOutUser } = useAuth();

  if (!isFirebaseEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="bg-surface-container-low w-full max-w-md rounded-2xl shadow-xl p-8 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-5xl mb-4">cloud_off</span>
          <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Admin Disabled</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            The admin dashboard needs Firebase credentials in .env. It's turned off for now while the storefront
            demo is shown.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface">
        <AuthModal onClose={() => {}} dismissible={false} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="bg-surface-container-low w-full max-w-md rounded-2xl shadow-xl p-8 text-center">
          <span className="material-symbols-outlined text-error text-5xl mb-4">block</span>
          <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Access Denied</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
            This account isn't on the admin allow-list for the dashboard.
          </p>
          <button
            type="button"
            onClick={signOutUser}
            className="bg-primary text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return children;
}
