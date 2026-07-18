import { useEffect, useState } from 'react';
import { subscribeToStoreSettings, saveStoreSettings, DEFAULT_STORE_SETTINGS } from '../../services/storeSettings.js';
import { useToast } from '../../context/ToastContext.jsx';

const FIELDS = [
  { key: 'storeName', label: 'Store Name', placeholder: 'A2Z Collection' },
  { key: 'location', label: 'Store Location', placeholder: 'Mumbai, Maharashtra' },
  { key: 'address', label: 'Store Address', placeholder: '123 Heritage Lane, Bandra West, Mumbai 400050', type: 'textarea' },
  { key: 'phone', label: 'Store Phone Number', placeholder: '+91 98765 43210' },
  { key: 'gstNumber', label: 'GST Number', placeholder: '27AAAAA0000A1Z5' },
  { key: 'facebookUrl', label: 'Facebook Page URL', placeholder: 'https://www.facebook.com/yourpage' },
];

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToStoreSettings((data, error) => {
      setSettings(data);
      setLoading(false);
      if (error) showToast(`Couldn't load saved store settings (${error.message || 'permission denied'}). Showing defaults.`);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (key) => (event) => setSettings((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveStoreSettings(settings);
      showToast('Store settings saved.');
    } catch (err) {
      showToast(err.message || 'Could not save store settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6">
        <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Store Settings</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          These details appear on generated order receipts and are saved for the whole team.
        </p>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10">
        <form onSubmit={handleSave} className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 max-w-2xl flex flex-col gap-5">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor={field.key}>
                {field.label}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  id={field.key}
                  rows={2}
                  value={settings[field.key] ?? ''}
                  onChange={updateField(field.key)}
                  placeholder={field.placeholder}
                  className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
                />
              ) : (
                <input
                  id={field.key}
                  value={settings[field.key] ?? ''}
                  onChange={updateField(field.key)}
                  placeholder={field.placeholder}
                  className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
                />
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="self-start bg-primary text-on-primary font-label-caps text-label-caps px-8 py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </form>
      </main>
    </div>
  );
}
