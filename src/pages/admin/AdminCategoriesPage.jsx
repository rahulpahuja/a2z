import { useEffect, useMemo, useState } from 'react';
import { subscribeToCategories, createCategory, deleteCategory, updateCategory } from '../../services/categories.js';
import {
  subscribeToSubcategories,
  createSubcategory,
  deleteSubcategory,
  updateSubcategory,
} from '../../services/subcategories.js';
import { subscribeToTopNav, saveTopNav, DEFAULT_TOP_NAV_LINKS } from '../../services/topNav.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function AdminCategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatTitle, setEditingCatTitle] = useState('');
  const [updatingCat, setUpdatingCat] = useState(false);

  const [subcategories, setSubcategories] = useState([]);
  const [subLoading, setSubLoading] = useState(true);
  const [subTitle, setSubTitle] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [savingSub, setSavingSub] = useState(false);
  const [editingSubId, setEditingSubId] = useState(null);
  const [editingSubTitle, setEditingSubTitle] = useState('');
  const [updatingSub, setUpdatingSub] = useState(false);

  const [topNavLinks, setTopNavLinks] = useState(DEFAULT_TOP_NAV_LINKS);
  const [topNavLoading, setTopNavLoading] = useState(true);
  const [savingNav, setSavingNav] = useState(false);
  const [newLinkType, setNewLinkType] = useState('category');
  const [newLinkCategoryId, setNewLinkCategoryId] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToCategories((rows, error) => {
      setCategories(rows);
      setLoadError(error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToSubcategories((rows) => {
      setSubcategories(rows);
      setSubLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToTopNav((links) => {
      setTopNavLinks(links);
      setTopNavLoading(false);
    });
    return unsubscribe;
  }, []);

  const subcategoriesByCategory = useMemo(() => {
    const map = {};
    subcategories.forEach((sub) => {
      if (!map[sub.categoryId]) map[sub.categoryId] = [];
      map[sub.categoryId].push(sub);
    });
    return map;
  }, [subcategories]);

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

  const handleCatEditStart = (category) => {
    setEditingCatId(category.id);
    setEditingCatTitle(category.title);
  };

  const handleCatEditCancel = () => {
    setEditingCatId(null);
    setEditingCatTitle('');
  };

  const handleCatEditSave = async (id) => {
    if (!editingCatTitle.trim()) return;
    setUpdatingCat(true);
    try {
      await updateCategory(id, { title: editingCatTitle });
      showToast('Category updated.');
      handleCatEditCancel();
    } catch (err) {
      showToast(err.message || 'Could not update category.');
    } finally {
      setUpdatingCat(false);
    }
  };

  const handleSubSubmit = async (event) => {
    event.preventDefault();
    if (!subTitle.trim() || !subCategoryId) return;
    const category = categories.find((c) => c.id === subCategoryId);
    setSavingSub(true);
    try {
      await createSubcategory({
        title: subTitle,
        categoryId: subCategoryId,
        categoryTitle: category?.title ?? '',
      });
      setSubTitle('');
      showToast('Subcategory created.');
    } catch (err) {
      showToast(err.message || 'Could not create subcategory.');
    } finally {
      setSavingSub(false);
    }
  };

  const handleSubDelete = async (id) => {
    try {
      await deleteSubcategory(id);
      showToast('Subcategory deleted.');
    } catch (err) {
      showToast(err.message || 'Could not delete subcategory.');
    }
  };

  const handleSubEditStart = (sub) => {
    setEditingSubId(sub.id);
    setEditingSubTitle(sub.title);
  };

  const handleSubEditCancel = () => {
    setEditingSubId(null);
    setEditingSubTitle('');
  };

  const handleSubEditSave = async (id) => {
    if (!editingSubTitle.trim()) return;
    setUpdatingSub(true);
    try {
      await updateSubcategory(id, { title: editingSubTitle });
      showToast('Subcategory updated.');
      handleSubEditCancel();
    } catch (err) {
      showToast(err.message || 'Could not update subcategory.');
    } finally {
      setUpdatingSub(false);
    }
  };

  const handleAddNavLink = () => {
    if (newLinkType === 'category') {
      const category = categories.find((c) => c.id === newLinkCategoryId);
      if (!category) return;
      setTopNavLinks((prev) => [
        ...prev,
        { id: `nav_${Date.now()}`, label: newLinkLabel.trim() || category.title, type: 'category', category: category.title },
      ]);
    } else {
      setTopNavLinks((prev) => [
        ...prev,
        { id: `nav_${Date.now()}`, label: newLinkLabel.trim() || 'All Products', type: 'all' },
      ]);
    }
    setNewLinkLabel('');
    setNewLinkCategoryId('');
  };

  const handleRemoveNavLink = (id) => {
    setTopNavLinks((prev) => prev.filter((link) => link.id !== id));
  };

  const handleNavLinkLabelChange = (id, label) => {
    setTopNavLinks((prev) => prev.map((link) => (link.id === id ? { ...link, label } : link)));
  };

  const handleMoveNavLink = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= topNavLinks.length) return;
    setTopNavLinks((prev) => {
      const copy = [...prev];
      [copy[index], copy[targetIndex]] = [copy[targetIndex], copy[index]];
      return copy;
    });
  };

  const handleSaveNavLinks = async () => {
    setSavingNav(true);
    try {
      await saveTopNav(topNavLinks);
      showToast('Top navigation bar updated.');
    } catch (err) {
      showToast(err.message || 'Could not save navigation links.');
    } finally {
      setSavingNav(false);
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
          <h2 className="font-title-sm text-title-sm text-on-surface mb-4">New Subcategory</h2>
          {categories.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Add a category first to unlock subcategories.
            </p>
          ) : (
            <form onSubmit={handleSubSubmit} className="flex flex-col sm:flex-row gap-3">
              <select
                value={subCategoryId}
                onChange={(e) => setSubCategoryId(e.target.value)}
                className="sm:w-64 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
              >
                <option value="" disabled>
                  Select a category
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.title}
                  </option>
                ))}
              </select>
              <input
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                placeholder="e.g. Silk Saree"
                className="flex-1 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
              />
              <button
                type="submit"
                disabled={savingSub || !subTitle.trim() || !subCategoryId}
                className="bg-primary text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Add Subcategory
              </button>
            </form>
          )}
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
              {categories.map((category) => {
                const isEditing = editingCatId === category.id;
                return (
                  <li key={category.id} className="py-3">
                    <div className="flex justify-between items-center gap-3">
                      {isEditing ? (
                        <input
                          value={editingCatTitle}
                          onChange={(e) => setEditingCatTitle(e.target.value)}
                          className="flex-1 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2 font-body-lg text-body-lg text-on-surface"
                          disabled={updatingCat}
                          autoFocus
                        />
                      ) : (
                        <span className="font-body-lg text-body-lg text-on-surface">{category.title}</span>
                      )}

                      <div className="flex gap-3 shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCatEditSave(category.id)}
                              disabled={updatingCat || !editingCatTitle.trim()}
                              className="text-primary font-label-caps text-label-caps hover:underline disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={handleCatEditCancel}
                              disabled={updatingCat}
                              className="text-on-surface-variant font-label-caps text-label-caps hover:underline"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCatEditStart(category)}
                              className="text-primary font-label-caps text-label-caps hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(category.id)}
                              className="text-error font-label-caps text-label-caps hover:underline"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {!subLoading && (subcategoriesByCategory[category.id]?.length ?? 0) > 0 && (
                      <ul className="mt-2 ml-4 pl-4 border-l border-outline-variant/30 flex flex-col gap-2">
                        {subcategoriesByCategory[category.id].map((sub) => {
                          const isSubEditing = editingSubId === sub.id;
                          return isSubEditing ? (
                            <li key={sub.id} className="flex justify-between items-center gap-3 py-1">
                              <input
                                value={editingSubTitle}
                                onChange={(e) => setEditingSubTitle(e.target.value)}
                                className="flex-1 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded px-2 py-1 font-body-sm text-body-sm text-on-surface"
                                disabled={updatingSub}
                                autoFocus
                              />
                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleSubEditSave(sub.id)}
                                  disabled={updatingSub || !editingSubTitle.trim()}
                                  className="text-primary font-label-caps text-[10px] hover:underline disabled:opacity-50"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSubEditCancel}
                                  disabled={updatingSub}
                                  className="text-on-surface-variant font-label-caps text-[10px] hover:underline"
                                >
                                  Cancel
                                </button>
                              </div>
                            </li>
                          ) : (
                            <li key={sub.id} className="flex justify-between items-center py-1">
                              <span className="font-body-sm text-body-sm text-on-surface-variant">{sub.title}</span>
                              <div className="flex gap-3 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleSubEditStart(sub)}
                                  className="text-primary font-label-caps text-[10px] hover:underline"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSubDelete(sub.id)}
                                  className="text-error font-label-caps text-[10px] hover:underline"
                                >
                                  Delete
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
          <h2 className="font-title-sm text-title-sm text-on-surface mb-1">Top Navigation Bar</h2>
          <p className="font-body-sm text-[12px] text-on-surface-variant mb-4">
            Choose which links appear in the header and mobile menu, built only from categories that already exist above.
          </p>

          {topNavLoading ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">Loading…</p>
          ) : (
            <>
              {topNavLinks.length === 0 ? (
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">No nav links yet — add one below.</p>
              ) : (
                <ul className="divide-y divide-outline-variant/20 mb-4">
                  {topNavLinks.map((link, idx) => (
                    <li key={link.id} className="flex items-center gap-3 py-3">
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveNavLink(idx, -1)}
                          disabled={idx === 0}
                          aria-label="Move up"
                          className="w-7 h-7 rounded border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors disabled:opacity-30"
                        >
                          <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveNavLink(idx, 1)}
                          disabled={idx === topNavLinks.length - 1}
                          aria-label="Move down"
                          className="w-7 h-7 rounded border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors disabled:opacity-30"
                        >
                          <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                        </button>
                      </div>
                      <input
                        value={link.label}
                        onChange={(e) => handleNavLinkLabelChange(link.id, e.target.value)}
                        className="flex-1 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface transition-colors"
                      />
                      <span className="text-[10px] text-on-surface-variant/70 font-mono shrink-0 whitespace-nowrap">
                        {link.type === 'all' ? 'All Products' : link.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveNavLink(link.id)}
                        className="text-error font-label-caps text-[10px] hover:underline shrink-0"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:items-end pt-4 border-t border-outline-variant/20">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant">Link Type</label>
                  <select
                    value={newLinkType}
                    onChange={(e) => setNewLinkType(e.target.value)}
                    className="bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2.5 font-body-sm text-body-sm text-on-surface transition-colors"
                  >
                    <option value="category">Existing Category</option>
                    <option value="all">All Products (New Arrivals)</option>
                  </select>
                </div>

                {newLinkType === 'category' && (
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="font-label-caps text-[10px] text-on-surface-variant">Category</label>
                    <select
                      value={newLinkCategoryId}
                      onChange={(e) => setNewLinkCategoryId(e.target.value)}
                      className="bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2.5 font-body-sm text-body-sm text-on-surface transition-colors"
                    >
                      <option value="">Select a category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="font-label-caps text-[10px] text-on-surface-variant">Label (optional override)</label>
                  <input
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="e.g. Sarees"
                    className="bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2.5 font-body-sm text-body-sm text-on-surface transition-colors"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddNavLink}
                  disabled={newLinkType === 'category' && !newLinkCategoryId}
                  className="bg-primary-container text-on-primary-container font-label-caps text-[11px] px-5 py-2.5 rounded-lg uppercase hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                >
                  Add Link
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveNavLinks}
                disabled={savingNav}
                className="mt-5 bg-primary text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingNav ? 'Saving…' : 'Save Navigation'}
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
