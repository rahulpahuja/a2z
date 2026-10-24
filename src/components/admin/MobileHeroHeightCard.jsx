import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { DEFAULT_STORE_SETTINGS, getStoreSettingsOnce, saveStoreSettings, subscribeToStoreSettings } from '../../services/storeSettings.js';
import './MobileHeroHeightCard.css';

export const HERO_HEIGHT_MIN = 12;
export const HERO_HEIGHT_MAX = 60;
const PRESETS = [
  { label: 'Compact', value: 18 },
  { label: 'Balanced', value: 24 },
  { label: 'Tall', value: 42 },
];

// Whole numbers within the allowed range; anything else falls back to the default.
export function clampHeroHeight(value) {
  // An empty box is "no value", not zero.
  if (value === '' || value === null || value === undefined) return DEFAULT_STORE_SETTINGS.mobileHeroHeightVh;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_STORE_SETTINGS.mobileHeroHeightVh;
  return Math.min(HERO_HEIGHT_MAX, Math.max(HERO_HEIGHT_MIN, n));
}

// The home banner's height on phones, as a share of the screen height. Wide banners leave blurred bands above
// and below when the frame is taller than the picture, so a smaller value trims them. Stored with the store
// settings, so Store Settings and this card always agree.
export default function MobileHeroHeightCard() {
  const { showToast } = useToast();
  const [saved, setSaved] = useState(DEFAULT_STORE_SETTINGS.mobileHeroHeightVh);
  const [value, setValue] = useState(DEFAULT_STORE_SETTINGS.mobileHeroHeightVh);
  const [saving, setSaving] = useState(false);

  useEffect(
    () =>
      subscribeToStoreSettings((settings) => {
        const current = clampHeroHeight(settings.mobileHeroHeightVh || DEFAULT_STORE_SETTINGS.mobileHeroHeightVh);
        setSaved(current);
        // Do not clobber an edit in progress, only follow the stored value when untouched.
        setValue((prev) => (prev === saved ? current : prev));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const dirty = value !== saved;
  const apply = (next) => setValue(clampHeroHeight(next));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Merge into the latest stored settings: saving replaces the whole settings record.
      const latest = await getStoreSettingsOnce();
      await saveStoreSettings({ ...latest, mobileHeroHeightVh: value });
      setSaved(value);
      showToast('Mobile banner height saved.');
    } catch (err) {
      showToast(err.message || 'Could not save the banner height.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-card hero-height-card" aria-labelledby="hero-height-title">
      <h3 id="hero-height-title" className="font-title-sm text-[0.9375rem] text-on-surface font-semibold flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[1.25rem]">smartphone</span>
        Mobile banner height
      </h3>
      <p className="hero-height-card__hint">
        How tall the home banner is on phones, as a share of the screen. Lower it to trim the blurred space above and below wide banners.
      </p>

      <div className="hero-height-card__row">
        <input
          type="range"
          className="hero-height-card__range"
          min={HERO_HEIGHT_MIN}
          max={HERO_HEIGHT_MAX}
          step="1"
          value={value}
          onChange={(e) => apply(e.target.value)}
          aria-label="Mobile banner height in percent of screen height"
        />
        <label className="hero-height-card__number">
          <input type="number" min={HERO_HEIGHT_MIN} max={HERO_HEIGHT_MAX} value={value} onChange={(e) => apply(e.target.value)} aria-label="Mobile banner height value" />
          <span>vh</span>
        </label>
      </div>

      <div className="hero-height-card__presets" role="group" aria-label="Banner height presets">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="hero-height-card__chip" aria-pressed={value === p.value} onClick={() => apply(p.value)}>
            {p.label} ({p.value})
          </button>
        ))}
      </div>

      <div className="hero-height-card__preview" aria-hidden="true">
        <div className="hero-height-card__phone">
          <div className="hero-height-card__banner" style={{ height: `${(value / 100) * 100}%` }}>Banner</div>
        </div>
        <span>{value}% of the screen</span>
      </div>

      <div className="hero-height-card__actions">
        <button type="button" className="btn btn-secondary py-2 px-4 text-[0.6875rem]" onClick={() => setValue(saved)} disabled={!dirty || saving}>
          Undo
        </button>
        <button type="button" className="btn btn-primary py-2 px-4 text-[0.6875rem]" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save height'}
        </button>
      </div>
    </section>
  );
}
