import { useEffect, useState } from 'react';
import { subscribeToReferrers, createReferrer, deleteReferrer } from '../../services/referrers.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function AdminReferrerDetailsPage() {
  const { showToast } = useToast();
  const [referrers, setReferrers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToReferrers((rows, error) => {
      setReferrers(rows);
      setLoadError(error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createReferrer({ name, phone });
      setName('');
      setPhone('');
      showToast('Referrer added.');
    } catch (err) {
      showToast(err.message || 'Could not add referrer.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteReferrer(id);
      showToast('Referrer deleted.');
    } catch (err) {
      showToast(err.message || 'Could not delete referrer.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6">
        <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Referrer Details</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          People who refer customers to the store. Once added, they're selectable as "Referred By" at checkout and
          show up on the generated bill.
        </p>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 flex flex-col gap-8">
        <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
          <h2 className="font-title-sm text-title-sm text-on-surface mb-4">New Referrer</h2>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Referrer name"
              className="flex-1 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)"
              type="tel"
              className="sm:w-56 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
            />
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="bg-primary text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Add Referrer
            </button>
          </form>
        </section>

        <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
          <h2 className="font-title-sm text-title-sm text-on-surface mb-4">All Referrers</h2>
          {loading ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">Loading…</p>
          ) : loadError ? (
            <p className="font-body-sm text-body-sm text-error">
              Couldn't load referrers ({loadError.message || 'permission denied'}). Check that this account is
              allowed to read/write the database.
            </p>
          ) : referrers.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              No referrers yet. Add one above to unlock "Referred By" at checkout.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant/20">
              {referrers.map((referrer) => (
                <li key={referrer.id} className="py-3 flex justify-between items-center gap-3">
                  <div>
                    <span className="font-body-lg text-body-lg text-on-surface">{referrer.name}</span>
                    {referrer.phone && (
                      <span className="font-body-sm text-body-sm text-on-surface-variant ml-3">{referrer.phone}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(referrer.id)}
                    className="text-error font-label-caps text-label-caps hover:underline shrink-0"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
