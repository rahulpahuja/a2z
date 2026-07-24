import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { subscribeToOrders } from '../services/orders.js';
import { getTrackingPortalUrl } from '../utils/trackingPortal.js';
import AuthModal from './AuthModal.jsx';
import ProfileModal from './ProfileModal.jsx';

function displayName(user, profile) {
  return profile?.displayName || user.displayName || user.email || user.phoneNumber || 'Account';
}

export default function ProfileButton({ className = '', iconClassName = 'material-symbols-outlined' }) {
  const { user, isAdmin, signOutUser } = useAuth();
  const { profile } = useProfile();
  const { trackSpecificOrder } = useCart();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [userOrders, setUserOrders] = useState([]);

  useEffect(() => {
    if (!user) {
      setUserOrders([]);
      return;
    }
    const unsubscribe = subscribeToOrders((orders) => {
      const filtered = orders.filter((o) => {
        // Filter orders by matching shipping details phone or email, or username matching first name
        const userPhoneDigits = user.phoneNumber ? user.phoneNumber.replace(/\D/g, '') : '';
        const shippingPhoneDigits = o.shippingDetails?.phone ? o.shippingDetails.phone.replace(/\D/g, '') : '';
        
        const phoneMatches = userPhoneDigits && shippingPhoneDigits && (userPhoneDigits.endsWith(shippingPhoneDigits) || shippingPhoneDigits.endsWith(userPhoneDigits));
        const emailMatches = user.email && o.shippingDetails?.email?.toLowerCase() === user.email.toLowerCase();
        
        // Fallback matching to let mock admin see mock orders or guest orders that match
        const nameMatches = user.displayName && o.shippingDetails?.firstName && 
          o.shippingDetails.firstName.toLowerCase().includes(user.displayName.split(' ')[0].toLowerCase());
          
        return phoneMatches || emailMatches || nameMatches || o.customerId === user.uid;
      });
      setUserOrders(filtered);
    });
    return unsubscribe;
  }, [user]);

  const handleTrackOrder = (order) => {
    trackSpecificOrder(order);
    setMenuOpen(false);
    navigate('/orders/tracking');
  };

  const containerClasses = `relative inline-flex items-center justify-center`;

  if (!user) {
    return (
      <div className={containerClasses}>
        <button
          type="button"
          aria-label="Sign In"
          className={className}
          onClick={() => setModalOpen(true)}
        >
          <span className={iconClassName}>person</span>
        </button>
        {modalOpen && <AuthModal onClose={() => setModalOpen(false)} />}
      </div>
    );
  }

  return (
    <div className={containerClasses}>
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
          <div className="absolute right-0 top-full mt-2 w-72 bg-surface rounded-xl shadow-xl border border-outline-variant py-2 z-[295] flex flex-col gap-1 max-h-[85vh] overflow-y-auto">
            {/* Header info */}
            <div className="px-4 py-2 border-b border-outline-variant/60">
              <p className="font-body-sm text-[12px] text-on-surface-variant font-medium">Logged in as</p>
              <p className="font-body-sm text-body-sm text-on-surface font-semibold truncate mt-0.5">
                {displayName(user, profile)}
              </p>
            </div>
            
            {/* My Orders Section */}
            <div className="px-4 py-2 flex flex-col gap-2">
              <h4 className="font-label-caps text-[9px] uppercase tracking-wider text-outline font-bold">My Orders</h4>
              {userOrders.length === 0 ? (
                <p className="text-[11px] text-on-surface-variant/70 italic py-1">No orders found.</p>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-[40vh] overflow-y-auto pr-1">
                  {userOrders.slice(0, 4).map((order) => (
                    <div key={order.id} className="p-2 bg-surface-container rounded-lg border border-outline-variant/30 flex flex-col gap-1.5 text-[11px]">
                      <div className="flex justify-between items-center font-mono">
                        <button
                          onClick={() => handleTrackOrder(order)}
                          className="font-bold text-primary hover:underline text-left text-[11px]"
                        >
                          {order.id}
                        </button>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          order.status === 'Delivered' 
                            ? 'bg-secondary/15 text-secondary' 
                            : order.status === 'Cancelled'
                            ? 'bg-error/15 text-error'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      
                      {/* Tracking link provision */}
                      {order.trackingId ? (
                        <div className="flex flex-wrap gap-2 items-center">
                          <button
                            onClick={() => handleTrackOrder(order)}
                            className="text-[10px] text-on-surface-variant hover:text-primary flex items-center gap-0.5 underline font-medium"
                          >
                            <span className="material-symbols-outlined text-[10px]">location_on</span>
                            Visual Track
                          </button>
                          <a
                            href={getTrackingPortalUrl(order.trackingPartner, order.trackingId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-secondary hover:underline flex items-center gap-0.5 font-semibold"
                          >
                            <span>Track on {order.trackingPartner} ↗</span>
                          </a>
                        </div>
                      ) : (
                        <p className="text-[9px] text-on-surface-variant/60 italic">No tracking info yet</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Menu options */}
            <div className="border-t border-outline-variant/60 mt-1 pt-1 flex flex-col">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setProfileModalOpen(true);
                }}
                className="flex items-center gap-2 w-full text-left px-4 py-2 font-body-sm text-body-sm text-on-surface hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Edit Profile
              </button>
              {isAdmin && (
                <Link
                  to="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 font-body-sm text-body-sm text-on-surface hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">dashboard</span>
                  Admin Dashboard
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  if (window.confirm("Are you confirming that you want to log out?")) {
                    signOutUser().then(() => navigate('/'));
                  }
                }}
                className="flex items-center gap-2 w-full text-left px-4 py-2 font-body-sm text-body-sm text-error hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
      {profileModalOpen && <ProfileModal onClose={() => setProfileModalOpen(false)} />}
    </div>
  );
}
