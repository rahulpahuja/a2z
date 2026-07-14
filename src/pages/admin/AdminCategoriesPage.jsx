import { useEffect, useState } from 'react';
import { subscribeToCategories, createCategory, deleteCategory } from '../../services/categories.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function AdminCategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToCategories((rows, error) => {
      setCategories(rows);
      setLoadError(error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createCategory({ title });
      setTitle('');
      showToast('Category created.');
    } catch (err) {
      showToast(err.message || 'Could not create category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCategory(id);
      showToast('Category deleted.');
    } catch (err) {
      showToast(err.message || 'Could not delete category.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6">
        <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Categories</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Products must belong to a category — create one here first.
        </p>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 flex flex-col gap-8">
        <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
          <h2 className="font-title-sm text-title-sm text-on-surface mb-4">New Category</h2>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sarees"
              className="flex-1 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
            />
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="bg-primary text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Add Category
            </button>
          </form>
        </section>

        <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
          <h2 className="font-title-sm text-title-sm text-on-surface mb-4">All Categories</h2>
          {loading ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">Loading…</p>
          ) : loadError ? (
            <p className="font-body-sm text-body-sm text-error">
              Couldn't load categories ({loadError.message || 'permission denied'}). Check that this account is
              allowed to read/write the database.
            </p>
          ) : categories.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              No categories yet. Add one above to unlock product creation.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant/20">
              {categories.map((category) => (
                <li key={category.id} className="flex justify-between items-center py-3">
                  <span className="font-body-lg text-body-lg text-on-surface">{category.title}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(category.id)}
                    className="text-error font-label-caps text-label-caps hover:underline"
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
