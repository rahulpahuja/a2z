import { useEffect, useState } from 'react';
import { subscribeToStoreSettings, saveStoreSettings, DEFAULT_STORE_SETTINGS, DEFAULT_REFUND_POLICY } from '../../services/storeSettings.js';
import { useToast } from '../../context/ToastContext.jsx';
import { MAX_FOOTER_TEXT_LENGTH, sanitizeFooterText } from '../../utils/footerText.js';
import { DEFAULT_ORDER_TEMPLATE, MAX_ORDER_TEMPLATE_LENGTH, ORDER_TEMPLATE_PLACEHOLDERS, buildProductOrderMessage, findUnknownPlaceholders } from '../../utils/whatsapp.js';
import './AdminSettingsPage.css';

const FIELDS = [
  { key: 'storeName', label: 'Store Name', placeholder: 'A2Z Collection' },
  { key: 'location', label: 'Store Location', placeholder: 'Mumbai, Maharashtra' },
  { key: 'address', label: 'Store Address', placeholder: '123 Heritage Lane, Bandra West, Mumbai 400050', type: 'textarea' },
  { key: 'phone', label: 'Store Phone Number', placeholder: '+91 98765 43210' },
  { key: 'gstNumber', label: 'GST Number', placeholder: '27AAAAA0000A1Z5' },
  { key: 'facebookUrl', label: 'Facebook Page URL', placeholder: 'https://www.facebook.com/yourpage' },
];

function SettingToggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 mt-5 cursor-pointer w-fit">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
      />
      <span className="font-body-sm text-body-sm text-on-surface">{label}</span>
    </label>
  );
}

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

  const updateTaxRate = (event) => {
    const value = event.target.value;
    setSettings((prev) => ({ ...prev, taxRatePercent: value === '' ? '' : Number(value) }));
  };

  const updateHomeProductsPerRow = (event) => {
    const value = event.target.value;
    setSettings((prev) => ({ ...prev, homeProductsPerRow: value === '' ? '' : Number(value) }));
  };

  const updateMobileHeroHeight = (event) => {
    const value = event.target.value;
    setSettings((prev) => ({ ...prev, mobileHeroHeightVh: value === '' ? '' : Number(value) }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const taxRatePercent = Math.min(100, Math.max(0, Number(settings.taxRatePercent) || 0));
      const homeProductsPerRow = Math.min(10, Math.max(4, Number(settings.homeProductsPerRow) || 8));
      const mobileHeroHeightVh = Math.min(60, Math.max(12, Math.round(Number(settings.mobileHeroHeightVh)) || DEFAULT_STORE_SETTINGS.mobileHeroHeightVh));
      const whatsappOrderTemplate = String(settings.whatsappOrderTemplate ?? '').trim().slice(0, MAX_ORDER_TEMPLATE_LENGTH) || DEFAULT_ORDER_TEMPLATE;
      const siteFooterText = sanitizeFooterText(settings.siteFooterText);
      const productFooterText = sanitizeFooterText(settings.productFooterText);
      await saveStoreSettings({ ...settings, taxRatePercent, homeProductsPerRow, mobileHeroHeightVh, whatsappOrderTemplate, siteFooterText, productFooterText });
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

          {/* Tax Rate applied to every order's subtotal at checkout */}
          <div className="border-t border-outline-variant/30 pt-5 mt-1">
            <h2 className="font-title-sm text-title-sm text-on-surface mb-1">Tax Rate</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
              Percentage applied to the subtotal at checkout (e.g. GST). Shown to customers as "Tax ({settings.taxRatePercent === '' ? '—' : settings.taxRatePercent}%)".
            </p>
            <div className="max-w-[200px]">
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="taxRatePercent">
                Tax Rate (%)
              </label>
              <input
                id="taxRatePercent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.taxRatePercent ?? ''}
                onChange={updateTaxRate}
                placeholder="18"
                className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
              />
            </div>
          </div>

          {/* Home Page Layout Provision for Super User */}
          <div className="border-t border-outline-variant/30 pt-5 mt-1">
            <h2 className="font-title-sm text-title-sm text-on-surface mb-1">Home Page Layout</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
              Super User setting — number of product cards shown per row in the Trending Now, Featured Elegance, and Heritage Masterpieces sections on the home page. Default 8.
            </p>
            <div className="max-w-[200px]">
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="homeProductsPerRow">
                Products Per Row (Home Page)
              </label>
              <input
                id="homeProductsPerRow"
                type="number"
                min="4"
                max="10"
                step="1"
                value={settings.homeProductsPerRow ?? ''}
                onChange={updateHomeProductsPerRow}
                placeholder="8"
                className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
              />
            </div>

            <div className="admin-settings-field">
              <label className="admin-settings-field__label" htmlFor="mobileHeroHeightVh">
                Banner Height on Phones (% of screen height)
              </label>
              <input
                id="mobileHeroHeightVh"
                className="admin-settings-field__input"
                type="number"
                min="12"
                max="60"
                step="1"
                value={settings.mobileHeroHeightVh ?? ''}
                onChange={updateMobileHeroHeight}
                placeholder={String(DEFAULT_STORE_SETTINGS.mobileHeroHeightVh)}
              />
              <p className="admin-settings-field__hint">
                Lower it to trim the blurred space above and below the home page banner on phones. Between 12 and 60; default {DEFAULT_STORE_SETTINGS.mobileHeroHeightVh}. Tablets and desktop are unchanged.
              </p>
            </div>

            <SettingToggle
              checked={settings.showCategoryBubbles ?? true}
              onChange={(showCategoryBubbles) => setSettings((prev) => ({ ...prev, showCategoryBubbles }))}
              label="Show the category row (Shots, Bags, Best Sellers, Coords, New Arrivals, Tops, Trousers) on the home page"
            />
            <SettingToggle
              checked={settings.showBannerHint ?? true}
              onChange={(showBannerHint) => setSettings((prev) => ({ ...prev, showBannerHint }))}
              label="Show a &quot;Tap to shop&quot; hint on the home page banner to first-time visitors"
            />
            <SettingToggle
              checked={settings.showBuyOnWhatsapp ?? DEFAULT_STORE_SETTINGS.showBuyOnWhatsapp}
              onChange={(showBuyOnWhatsapp) => setSettings((prev) => ({ ...prev, showBuyOnWhatsapp }))}
              label="Show a &quot;Buy on WhatsApp&quot; button on product pages"
            />

            <div className="admin-settings-field admin-settings-field--wide">
              <label className="admin-settings-field__label" htmlFor="whatsappOrderTemplate">
                WhatsApp Order Message
              </label>
              <textarea
                id="whatsappOrderTemplate"
                className="admin-settings-field__input admin-settings-field__textarea"
                rows={8}
                maxLength={MAX_ORDER_TEMPLATE_LENGTH}
                value={settings.whatsappOrderTemplate ?? DEFAULT_ORDER_TEMPLATE}
                onChange={updateField('whatsappOrderTemplate')}
              />
              <div className="admin-settings-field__actions">
                <button
                  type="button"
                  className="admin-settings-field__link"
                  onClick={() => setSettings((prev) => ({ ...prev, whatsappOrderTemplate: DEFAULT_ORDER_TEMPLATE }))}
                >
                  Reset to default message
                </button>
              </div>
              <p className="admin-settings-field__hint">
                Sent to your WhatsApp number when a shopper taps Buy on WhatsApp. Use these placeholders and they are filled in
                for each product; a line whose value is empty (for example no colour chosen) is left out:
              </p>
              <ul className="admin-settings-field__placeholders">
                {ORDER_TEMPLATE_PLACEHOLDERS.map(({ key, description }) => (
                  <li key={key}>
                    <code>{`{${key}}`}</code> {description}
                  </li>
                ))}
              </ul>
              {findUnknownPlaceholders(settings.whatsappOrderTemplate).length > 0 && (
                <p className="admin-settings-field__warning" role="alert">
                  Not a known placeholder, so it will be sent as typed:{' '}
                  {findUnknownPlaceholders(settings.whatsappOrderTemplate).map((key) => `{${key}}`).join(', ')}
                </p>
              )}
              <p className="admin-settings-field__label">Preview (sample product, quantity 2)</p>
              <pre className="admin-settings-field__preview">
                {buildProductOrderMessage({
                  name: 'Silk Kurta',
                  url: 'https://www.thea2zcollection.com/products/example',
                  color: 'Pink',
                  size: 'M',
                  quantity: 2,
                  unitPrice: '\u20B91,299',
                  total: '\u20B92,598',
                  template: settings.whatsappOrderTemplate,
                })}
              </pre>
            </div>
          </div>

          {/* Refund Policy Provision for Super User */}
          <div className="border-t border-outline-variant/30 pt-5 mt-1">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-title-sm text-title-sm text-on-surface">Refund &amp; Return Policy</h2>
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, refundPolicy: DEFAULT_REFUND_POLICY }))}
                className="text-xs text-primary hover:underline font-label-caps uppercase tracking-wider"
              >
                Reset to Default Policy
              </button>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
              Super User setting to alter the refund policy displayed on <code className="text-xs font-mono bg-surface-container-high px-1 rounded">/refund-policy</code>.
            </p>
            <div>
              <textarea
                id="refundPolicy"
                rows={12}
                value={settings.refundPolicy ?? DEFAULT_REFUND_POLICY}
                onChange={updateField('refundPolicy')}
                placeholder="Enter custom refund policy..."
                className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-mono text-sm text-on-surface transition-colors leading-relaxed"
              />
            </div>
          </div>

          <div className="border-t border-outline-variant/30 pt-5 mt-1 flex flex-col gap-5">
            <div>
              <h2 className="font-title-sm text-title-sm text-on-surface mb-1">Footer Text</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Plain text only (up to {MAX_FOOTER_TEXT_LENGTH} characters; line breaks are kept). Leave a field empty to hide it.
              </p>
            </div>
            {[
              { key: 'siteFooterText', label: 'Every page', hint: 'Shown at the very bottom of every customer-facing page.', placeholder: 'e.g. Free shipping on orders above ₹999' },
              { key: 'productFooterText', label: 'Every product page', hint: 'Shown on each product page, just above the site footer.', placeholder: 'e.g. Colours may vary slightly from the photos.' },
            ].map((field) => (
              <div key={field.key}>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor={field.key}>
                  {field.label}
                </label>
                <textarea
                  id={field.key}
                  rows={3}
                  maxLength={MAX_FOOTER_TEXT_LENGTH}
                  value={settings[field.key] ?? ''}
                  onChange={updateField(field.key)}
                  placeholder={field.placeholder}
                  className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
                />
                <p className="text-[0.625rem] text-on-surface-variant/60 mt-1">
                  {field.hint} {String(settings[field.key] ?? '').length}/{MAX_FOOTER_TEXT_LENGTH}
                </p>
              </div>
            ))}
          </div>

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
