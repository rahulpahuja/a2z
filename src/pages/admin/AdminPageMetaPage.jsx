import { useEffect, useState } from 'react';
import { subscribeToPageMeta, savePageMeta } from '../../services/pageMeta.js';
import { listIndexableRoutes } from '../../seo/routes.js';
import { META_ATTRS, isValidMetaKey, pageMetaKey, sanitizeMetaTags } from '../../seo/pageMeta.js';
import { useToast } from '../../context/ToastContext.jsx';

const ROUTES = listIndexableRoutes();
const INPUT_CLASS =
  'w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface transition-colors';
const LABEL_CLASS = 'block font-label-caps text-label-caps text-on-surface-variant mb-1';
const EMPTY_TAG = { attr: 'name', key: '', content: '' };

const toDraft = (saved) => ({
  title: saved?.title ?? '',
  description: saved?.description ?? '',
  metaTags: Object.values(saved?.metaTags ?? {}),
});

function PageMetaCard({ route, saved, onSave }) {
  const { showToast } = useToast();
  const [draft, setDraft] = useState(() => toDraft(saved));
  const [saving, setSaving] = useState(false);

  // Follow changes saved elsewhere (another admin, or the reset below). Keyed on the
  // content, not the object, since every save re-delivers every page's entry.
  const savedJson = JSON.stringify(saved ?? null);
  useEffect(() => setDraft(toDraft(JSON.parse(savedJson))), [savedJson]);

  const setField = (field) => (event) => setDraft((prev) => ({ ...prev, [field]: event.target.value }));
  const updateTag = (index, field, value) =>
    setDraft((prev) => ({ ...prev, metaTags: prev.metaTags.map((tag, i) => (i === index ? { ...tag, [field]: value } : tag)) }));
  const removeTag = (index) => setDraft((prev) => ({ ...prev, metaTags: prev.metaTags.filter((_, i) => i !== index) }));
  const addTag = () => setDraft((prev) => ({ ...prev, metaTags: [...prev.metaTags, { ...EMPTY_TAG }] }));

  const persist = async (entry, message) => {
    setSaving(true);
    try {
      await onSave(entry);
      showToast(message);
    } catch (err) {
      showToast(err.message || 'Could not save page SEO.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const invalidKey = draft.metaTags.find((tag) => tag.key.trim() && !isValidMetaKey(tag.key.trim()));
    if (invalidKey) {
      showToast(`"${invalidKey.key}" isn't a valid meta tag name. Use letters, numbers, ":", "." , "_" or "-".`);
      return;
    }
    persist(
      { title: draft.title.trim(), description: draft.description.trim(), metaTags: sanitizeMetaTags(draft.metaTags) },
      `Saved SEO for ${route.path}.`
    );
  };

  const handleReset = () => persist({ title: '', description: '', metaTags: [] }, `${route.path} reset to its default.`);

  return (
    <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 flex flex-col gap-4">
      <h2 className="font-title-sm text-title-sm text-on-surface">
        {route.title} <span className="font-mono text-[0.75rem] text-on-surface-variant">{route.path}</span>
      </h2>

      <div>
        <label className={LABEL_CLASS} htmlFor={`title-${route.path}`}>Page Title</label>
        <input id={`title-${route.path}`} value={draft.title} onChange={setField('title')} placeholder={route.title} className={INPUT_CLASS} />
      </div>
      <div>
        <label className={LABEL_CLASS} htmlFor={`description-${route.path}`}>Meta Description</label>
        <textarea
          id={`description-${route.path}`}
          rows={2}
          value={draft.description}
          onChange={setField('description')}
          placeholder={route.description}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <p className={LABEL_CLASS}>Custom Meta Tags</p>
        <div className="flex flex-col gap-2">
          {draft.metaTags.map((tag, index) => (
            <div key={index} className="grid grid-cols-[110px_1fr_2fr_auto] gap-2 items-center">
              <select aria-label="Tag attribute" value={tag.attr} onChange={(e) => updateTag(index, 'attr', e.target.value)} className={INPUT_CLASS}>
                {META_ATTRS.map((attr) => (
                  <option key={attr} value={attr}>{attr}</option>
                ))}
              </select>
              <input
                aria-label="Tag name"
                value={tag.key}
                onChange={(e) => updateTag(index, 'key', e.target.value)}
                placeholder={tag.attr === 'property' ? 'og:image' : 'keywords'}
                className={INPUT_CLASS}
              />
              <input
                aria-label="Tag content"
                value={tag.content}
                onChange={(e) => updateTag(index, 'content', e.target.value)}
                placeholder="content"
                className={INPUT_CLASS}
              />
              <button type="button" aria-label="Remove meta tag" onClick={() => removeTag(index)} className="text-error hover:opacity-80">
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addTag} className="mt-2 text-xs text-primary hover:underline font-label-caps uppercase tracking-wider">
          + Add meta tag
        </button>
        <p className="font-body-sm text-[0.75rem] text-on-surface-variant mt-1">
          A tag with the same name as one the page already has (description, robots, og:image…) replaces it.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="bg-primary text-on-primary font-label-caps text-label-caps px-6 py-2 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && (
          <button type="button" disabled={saving} onClick={handleReset} className="text-xs text-primary hover:underline font-label-caps uppercase tracking-wider">
            Reset to default
          </button>
        )}
      </div>
    </section>
  );
}

export default function AdminPageMetaPage() {
  const [overrides, setOverrides] = useState(null);

  useEffect(() => subscribeToPageMeta(setOverrides), []);

  if (!overrides) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6">
        <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Page SEO</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Customise each page's title, description and meta tags. Blank fields keep the default shown as a placeholder. Product pages build their own from the product details.
        </p>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 flex flex-col gap-6">
        {ROUTES.map((route) => (
          <PageMetaCard
            key={route.path}
            route={route}
            saved={overrides[pageMetaKey(route.path)]}
            onSave={(entry) => savePageMeta(pageMetaKey(route.path), entry)}
          />
        ))}
      </main>
    </div>
  );
}
