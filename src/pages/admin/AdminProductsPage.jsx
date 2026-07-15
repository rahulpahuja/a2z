import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToCategories } from '../../services/categories.js';
import { subscribeToAdminProducts, createAdminProduct, deleteAdminProduct } from '../../services/adminProducts.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatCurrency } from '../../context/CartContext.jsx';
import BarcodeModal from '../../components/admin/BarcodeModal.jsx';

const uploadImageToExternalServer = async (file) => {
  await new Promise((resolve) => setTimeout(resolve, 800)); // simulate network delay
  const uniqueId = Math.random().toString(36).substring(2, 9);
  return `https://external-image-server.com/uploads/${uniqueId}_${file.name}`;
};

const QUICK_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

const EMPTY_FORM = {
  title: '',
  description: '',
  hashtagsInput: '',
  categoryId: '',
  price: '',
  hsnCode: '',
};

export default function AdminProductsPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [colors, setColors] = useState([]);
  const [colorInput, setColorInput] = useState('');
  const [sizes, setSizes] = useState([]); // [{ size, stock }]
  const [customSize, setCustomSize] = useState('');
  const [saving, setSaving] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    const unsubCategories = subscribeToCategories((rows) => setCategories(rows));
    const unsubProducts = subscribeToAdminProducts((rows, error) => {
      setProducts(rows);
      setLoadError(error);
      setLoading(false);
    });
    return () => {
      unsubCategories();
      unsubProducts();
    };
  }, []);

  const updateField = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const addColor = () => {
    const value = colorInput.trim();
    if (value && !colors.includes(value)) {
      setColors((prev) => [...prev, value]);
    }
    setColorInput('');
  };

  const removeColor = (value) => setColors((prev) => prev.filter((c) => c !== value));

  const addSize = (size) => {
    if (!size.trim() || sizes.some((s) => s.size === size)) return;
    setSizes((prev) => [...prev, { size, stock: 0 }]);
    setCustomSize('');
  };

  const updateSizeStock = (size, stock) => {
    setSizes((prev) => prev.map((s) => (s.size === size ? { ...s, stock: Math.max(0, Number(stock) || 0) } : s)));
  };

  const removeSize = (size) => setSizes((prev) => prev.filter((s) => s.size !== size));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setColors([]);
    setColorInput('');
    setSizes([]);
    setCustomSize('');
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.categoryId) {
      showToast('Select a category before adding a product.');
      return;
    }
    if (colors.length === 0) {
      showToast('Add at least one color.');
      return;
    }
    if (sizes.length === 0) {
      showToast('Add at least one size with stock.');
      return;
    }
    const category = categories.find((c) => c.id === form.categoryId);
    setSaving(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadImageToExternalServer(imageFile);
      }
      await createAdminProduct({
        title: form.title.trim(),
        description: form.description.trim(),
        hashtags: form.hashtagsInput
          .split(/[\s,]+/)
          .map((tag) => tag.trim())
          .filter(Boolean)
          .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)),
        categoryId: form.categoryId,
        categoryTitle: category?.title ?? '',
        price: Number(form.price) || 0,
        hsnCode: form.hsnCode.trim(),
        colors,
        sizes,
        image: imageUrl, // Uploaded image URL stored in Firebase
      });
      showToast('Product created.');
      resetForm();
    } catch (err) {
      showToast(err.message || 'Could not create product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdminProduct(id);
      showToast('Product deleted.');
    } catch (err) {
      showToast(err.message || 'Could not delete product.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6">
        <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Products</h1>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 flex flex-col gap-8">
        {categories.length === 0 && !loading ? (
          <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 text-center">
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-4">
              You need at least one category before you can add a product.
            </p>
            <Link
              to="/super/categories"
              className="inline-block bg-primary text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Create a Category
            </Link>
          </section>
        ) : (
          <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
            <h2 className="font-title-sm text-title-sm text-on-surface mb-4">New Product</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="p-title">
                    Title
                  </label>
                  <input
                    id="p-title"
                    required
                    value={form.title}
                    onChange={updateField('title')}
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="p-category">
                    Category
                  </label>
                  <select
                    id="p-category"
                    required
                    value={form.categoryId}
                    onChange={updateField('categoryId')}
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
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
                </div>
              </div>

              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="p-desc">
                  Description
                </label>
                <textarea
                  id="p-desc"
                  required
                  rows={3}
                  value={form.description}
                  onChange={updateField('description')}
                  className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
                />
              </div>

              {/* Image Upload & Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="p-image">
                    Product Image
                  </label>
                  <input
                    id="p-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-sm text-body-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-label-caps file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                  <p className="font-body-sm text-body-sm text-on-surface-variant/70 mt-2">
                    Image will be uploaded to external server, and path will be stored in Firebase.
                  </p>
                </div>
                {imagePreview && (
                  <div>
                    <span className="block font-label-caps text-label-caps text-on-surface-variant mb-2">Image Preview</span>
                    <div className="w-24 aspect-[3/4] rounded-lg overflow-hidden border border-outline-variant">
                      <img src={imagePreview} className="w-full h-full object-cover" alt="Upload preview" />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="p-price">
                    Price (₹)
                  </label>
                  <input
                    id="p-price"
                    type="number"
                    min="0"
                    required
                    value={form.price}
                    onChange={updateField('price')}
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="p-hsn">
                    HSN Code
                  </label>
                  <input
                    id="p-hsn"
                    required
                    value={form.hsnCode}
                    onChange={updateField('hsnCode')}
                    placeholder="e.g. 6204"
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="p-hashtags">
                    Hashtags
                  </label>
                  <input
                    id="p-hashtags"
                    value={form.hashtagsInput}
                    onChange={updateField('hashtagsInput')}
                    placeholder="silk, festive, saree"
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
                  />
                </div>
              </div>

              {/* Colors */}
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                  Colors (add multiple)
                </label>
                <div className="flex gap-3">
                  <input
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addColor();
                      }
                    }}
                    placeholder="e.g. Hot Pink — press Enter"
                    className="flex-1 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
                  />
                  <button
                    type="button"
                    onClick={addColor}
                    className="px-5 py-2 rounded-lg border border-outline-variant text-on-surface font-label-caps text-label-caps uppercase hover:border-primary hover:text-primary transition-colors"
                  >
                    Add
                  </button>
                </div>
                {colors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {colors.map((color) => (
                      <span
                        key={color}
                        className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-on-surface font-body-sm text-body-sm"
                      >
                        {color}
                        <button type="button" onClick={() => removeColor(color)} className="text-on-surface-variant hover:text-error">
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Sizes + stock */}
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                  Sizes &amp; Stock
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {QUICK_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => addSize(size)}
                      disabled={sizes.some((s) => s.size === size)}
                      className="px-4 py-2 rounded-full border border-outline-variant text-on-surface font-label-caps text-label-caps hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {size}
                    </button>
                  ))}
                  <div className="flex gap-2">
                    <input
                      value={customSize}
                      onChange={(e) => setCustomSize(e.target.value)}
                      placeholder="Custom size"
                      className="w-32 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => addSize(customSize)}
                      className="px-4 py-2 rounded-full border border-outline-variant text-on-surface font-label-caps text-label-caps hover:border-primary hover:text-primary transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
                {sizes.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {sizes.map((s) => (
                      <div key={s.size} className="flex items-center gap-3 border border-outline-variant/30 rounded-lg px-4 py-2">
                        <span className="font-body-sm text-body-sm text-on-surface w-24">{s.size}</span>
                        <label className="font-body-sm text-body-sm text-on-surface-variant" htmlFor={`stock-${s.size}`}>
                          Stock
                        </label>
                        <input
                          id={`stock-${s.size}`}
                          type="number"
                          min="0"
                          value={s.stock}
                          onChange={(e) => updateSizeStock(s.size, e.target.value)}
                          className="w-24 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-1 font-body-sm text-body-sm text-on-surface transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => removeSize(s.size)}
                          className="ml-auto text-error font-label-caps text-label-caps hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="self-start bg-primary text-on-primary font-label-caps text-label-caps px-8 py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Add Product'}
              </button>
            </form>
          </section>
        )}

        {/* Product list */}
        <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
          <h2 className="font-title-sm text-title-sm text-on-surface mb-4">All Products</h2>
          {loading ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">Loading…</p>
          ) : loadError ? (
            <p className="font-body-sm text-body-sm text-error">
              Couldn't load products ({loadError.message || 'permission denied'}).
            </p>
          ) : products.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">No products yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {products.map((product) => {
                const totalStock = (product.sizes ?? []).reduce((sum, s) => sum + (s.stock ?? 0), 0);
                return (
                  <div key={product.id} className="border border-outline-variant/30 rounded-lg p-4 flex gap-4 items-start">
                    {product.image && (
                      <div className="w-16 h-20 rounded-lg overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/30">
                        <img src={product.image} className="w-full h-full object-cover" alt={product.title} />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <h3 className="font-title-sm text-title-sm text-on-surface">{product.title}</h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          {product.categoryTitle} · {formatCurrency(product.price)} · HSN {product.hsnCode} · SKU {product.sku}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setBarcodeProduct(product)}
                          className="font-label-caps text-label-caps text-primary hover:underline"
                        >
                          Print Barcode
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product.id)}
                          className="font-label-caps text-label-caps text-error hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Colors: {(product.colors ?? []).join(', ') || '—'}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Sizes: {(product.sizes ?? []).map((s) => `${s.size} (${s.stock})`).join(', ') || '—'} · Total stock: {totalStock}
                    </p>
                    {product.hashtags?.length > 0 && (
                      <p className="font-body-sm text-body-sm text-secondary">{product.hashtags.join(' ')}</p>
                    )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {barcodeProduct && <BarcodeModal product={barcodeProduct} onClose={() => setBarcodeProduct(null)} />}
    </div>
  );
}
