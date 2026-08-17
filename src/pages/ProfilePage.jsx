import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CartIconButton from '../components/CartIconButton.jsx';
import ProfileButton from '../components/ProfileButton.jsx';
import AuthModal from '../components/AuthModal.jsx';
import MobileNavDrawer from '../components/MobileNavDrawer.jsx';
import { subscribeToTopNav, topNavLinkToPath, DEFAULT_TOP_NAV_LINKS } from '../services/topNav.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { INDIAN_STATES_AND_UT, STATE_CITIES } from '../data/indiaData.js';

const inputClassName =
  'w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2.5 font-body-sm text-body-sm text-on-surface transition-colors';

const EMPTY_ADDRESS = {
  label: '',
  firstName: '',
  lastName: '',
  phone: '',
  address: '',
  apartment: '',
  city: '',
  state: '',
  zip: '',
};

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5">
        {label}
      </label>
      <input className={inputClassName} {...props} />
    </div>
  );
}

function AddressForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(initial || EMPTY_ADDRESS);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'state') {
      setForm((prev) => ({ ...prev, state: value, city: '' }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Field label="Label (e.g. Home, Office)" name="label" value={form.label} onChange={handleChange} placeholder="Home" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="First Name" name="firstName" value={form.firstName} onChange={handleChange} />
        <Field label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} />
      </div>
      <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} placeholder="10-digit mobile number" />
      <Field label="Address" name="address" value={form.address} onChange={handleChange} placeholder="Street address or P.O. Box" />
      <Field label="Apartment, suite, etc. (optional)" name="apartment" value={form.apartment} onChange={handleChange} />
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5">
            State
          </label>
          <select className={`${inputClassName} appearance-none`} name="state" value={form.state} onChange={handleChange}>
            <option value="">Select</option>
            {INDIAN_STATES_AND_UT.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5">
            City
          </label>
          <select
            className={`${inputClassName} appearance-none`}
            name="city"
            value={form.city}
            onChange={handleChange}
            disabled={!form.state}
          >
            <option value="">Select</option>
            {form.state && STATE_CITIES[form.state]?.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
        <Field label="Zip Code" name="zip" value={form.zip} onChange={handleChange} />
      </div>
      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-outline-variant text-on-surface font-label-caps text-label-caps py-2.5 rounded-lg uppercase tracking-wider hover:bg-surface-container transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 bg-primary text-on-primary font-label-caps text-label-caps py-2.5 rounded-lg uppercase tracking-wider hover:opacity-90 transition-opacity"
        >
          Save Address
        </button>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profile, setDisplayName, saveAddress, removeAddress } = useProfile();
  const [name, setName] = useState(profile.displayName || '');
  const [editingAddress, setEditingAddress] = useState(null); // null | 'new' | address object
  const [savedMessage, setSavedMessage] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [topNavLinks, setTopNavLinks] = useState(DEFAULT_TOP_NAV_LINKS);

  useEffect(() => {
    const unsub = subscribeToTopNav((links) => setTopNavLinks(links));
    return unsub;
  }, []);

  const navLinks = topNavLinks.map((link) => ({ label: link.label, to: topNavLinkToPath(link) }));

  const handleSaveName = (event) => {
    event.preventDefault();
    setDisplayName(name.trim());
    setSavedMessage('Name saved.');
    setTimeout(() => setSavedMessage(''), 2000);
  };

  const handleSaveAddress = (address) => {
    saveAddress(address);
    setEditingAddress(null);
  };

  if (!user) {
    return (
      <>
        <header className="w-full px-margin-mobile md:px-margin-desktop py-4 bg-surface border-b border-surface-variant flex justify-between items-center max-w-container-max mx-auto">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden text-primary dark:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
              A2Z Collection
            </Link>
          </div>
        </header>
        <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} links={navLinks} />
        <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-16 flex flex-col items-center text-center gap-3">
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface">
            Sign In to View Your Profile
          </h1>
        </main>
        <AuthModal dismissible onClose={() => navigate('/')} />
      </>
    );
  }

  return (
    <>
      <header className="bg-surface dark:bg-surface-container-highest flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto z-50 docked full-width top-0 sticky">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden text-primary dark:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <Link to="/" className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
            A2Z Collection
          </Link>
        </div>
        <nav className="hidden md:flex gap-8 items-center font-label-caps text-label-caps">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:opacity-80 transition-opacity duration-200"
              to={link.to}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-unit text-primary dark:text-primary-fixed-dim">
          <CartIconButton className="p-2 hover:opacity-80 transition-opacity duration-200" />
          <ProfileButton className="p-2 hover:opacity-80 transition-opacity duration-200" />
        </div>
      </header>
      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} links={navLinks} />

      <main className="max-w-2xl mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors mb-6"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back
        </button>

        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-8">
          My Profile
        </h1>

        <form onSubmit={handleSaveName} className="flex flex-col gap-3 mb-8 pb-8 border-b border-outline-variant">
          <label className="block font-label-caps text-label-caps text-on-surface-variant" htmlFor="profile-name">
            Your Name
          </label>
          <div className="flex gap-3">
            <input
              id="profile-name"
              className={inputClassName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={user?.email || user?.phoneNumber || 'Enter your name'}
            />
            <button
              type="submit"
              className="bg-primary text-on-primary font-label-caps text-label-caps px-5 py-2.5 rounded-lg uppercase tracking-wider hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Save
            </button>
          </div>
          {savedMessage && <p className="font-body-sm text-body-sm text-secondary">{savedMessage}</p>}
        </form>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-title-sm text-title-sm text-on-surface">Saved Addresses</h2>
          {editingAddress === null && (
            <button
              type="button"
              onClick={() => setEditingAddress('new')}
              className="font-body-sm text-body-sm text-primary hover:underline"
            >
              + Add New Address
            </button>
          )}
        </div>

        {editingAddress !== null ? (
          <AddressForm
            initial={editingAddress === 'new' ? null : editingAddress}
            onCancel={() => setEditingAddress(null)}
            onSave={handleSaveAddress}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {(profile.addresses || []).length === 0 && (
              <p className="font-body-sm text-body-sm text-on-surface-variant italic">No saved addresses yet.</p>
            )}
            {(profile.addresses || []).map((addr) => (
              <div
                key={addr.id}
                className="bg-surface-container rounded-lg border border-outline-variant/40 p-4 flex justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-body-sm text-body-sm font-semibold text-on-surface">
                    {addr.label || 'Address'} — {addr.firstName} {addr.lastName}
                  </p>
                  <p className="font-body-sm text-[12px] text-on-surface-variant truncate">
                    {addr.address}{addr.apartment ? `, ${addr.apartment}` : ''}, {addr.city}, {addr.state} {addr.zip}
                  </p>
                  <p className="font-body-sm text-[12px] text-on-surface-variant">{addr.phone}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingAddress(addr)}
                    className="font-body-sm text-[12px] text-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAddress(addr.id)}
                    className="font-body-sm text-[12px] text-error hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
