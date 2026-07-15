import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToCategories } from '../../services/categories.js';
import { subscribeToSubcategories } from '../../services/subcategories.js';
import { subscribeToAdminProducts, createAdminProduct, deleteAdminProduct, createFileMetadata } from '../../services/adminProducts.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatCurrency } from '../../context/CartContext.jsx';
import BarcodeModal from '../../components/admin/BarcodeModal.jsx';

const uploadImageToExternalServer = async (file, customName) => {
  const apiUrl = import.meta.env.VITE_IMAGE_UPLOAD_API_URL;
  if (apiUrl) {
    const formData = new FormData();
    formData.append('file', file, customName);

    const response = await fetch(`${apiUrl}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data.url;
  }

  await new Promise((resolve) => setTimeout(resolve, 800)); // simulate network delay
  return `https://external-image-server.com/uploads/${customName}`;
};

const QUICK_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

const EMPTY_FORM = {
  title: '',
  description: '',
  hashtagsInput: '',
  categoryId: '',
  subcategoryId: '',
  price: '',
  hsnCode: '',
};

export default function AdminProductsPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
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
  const [productId, setProductId] = useState('');
  const [imageFiles, setImageFiles] = useState([null, null, null, null, null]);
  const [imagePreviews, setImagePreviews] = useState(['', '', '', '', '']);
  const [imageNames, setImageNames] = useState(['', '', '', '', '']);
  const [editingProductId, setEditingProductId] = useState(null);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  const getR2KeyFromUrl = (url) => {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/');
      return parts[parts.length - 1]; // gets filename
    } catch {
      return null;
    }
  };

  const deleteProductAndImages = async (product) => {
    const urls = product.images || (product.image ? [product.image] : []);
    const deletePromises = urls.map(async (url) => {
      const key = getR2KeyFromUrl(url);
      if (key) {
        try {
          const apiUrl = import.meta.env.VITE_IMAGE_UPLOAD_API_URL;
          if (apiUrl) {
            await fetch(`${apiUrl}/${key}`, {
              method: 'DELETE',
            });
          }
        } catch (e) {
          console.error(`Failed to delete R2 file: ${key}`, e);
        }
      }
    });
    await Promise.all(deletePromises);
    await deleteAdminProduct(product.id);
  };

  const handleStartEdit = (product) => {
    setEditingProductId(product.id);
    setProductId(product.id);
    setForm({
      title: product.title || product.name || '',
      description: product.description || '',
      categoryId: product.categoryId || '',
      subcategoryId: product.subcategoryId || '',
      price: product.price || '',
      hsnCode: product.hsnCode || '',
      hashtagsInput: (product.hashtags ?? []).join(', '),
    });
    setColors(product.colors ?? []);
    setSizes(product.sizes ?? []);
    setImageFiles([null, null, null, null, null]);

    const initialPreviews = ['', '', '', '', ''];
    const initialNames = ['', '', '', '', ''];
    if (product.images && product.images.length > 0) {
      product.images.forEach((url, idx) => {
        if (idx < 5) {
          initialPreviews[idx] = url;
          initialNames[idx] = getR2KeyFromUrl(url) || '';
        }
      });
    } else if (product.image) {
      initialPreviews[0] = product.image;
      initialNames[0] = getR2KeyFromUrl(product.image) || '';
    }
    setImagePreviews(initialPreviews);
    setImageNames(initialNames);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSelectProduct = (id) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((p) => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the ${selectedProductIds.length} selected products? This will remove all associated database records and images from R2 storage. This action cannot be undone.`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const deletePromises = selectedProductIds.map(async (id) => {
        const product = products.find((p) => p.id === id);
        if (product) {
          await deleteProductAndImages(product);
        }
      });
      await Promise.all(deletePromises);
      showToast(`${selectedProductIds.length} products deleted successfully.`);
      setSelectedProductIds([]);
    } catch (err) {
      showToast(err.message || 'Could not delete some products.');
    } finally {
      setSaving(false);
    }
  };

  const generateProductId = () => `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const handleImageChange = (index, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.substring(file.name.lastIndexOf('.')) || '.jpg';
      const autoName = `${productId}_image_${index + 1}${ext}`;

      setImageFiles((prev) => {
        const copy = [...prev];
        copy[index] = file;
        return copy;
      });

      setImagePreviews((prev) => {
        const copy = [...prev];
        if (copy[index]) URL.revokeObjectURL(copy[index]);
        copy[index] = URL.createObjectURL(file);
        return copy;
      });

      setImageNames((prev) => {
        const copy = [...prev];
        copy[index] = autoName;
        return copy;
      });
    }
  };

  const handleImageNameChange = (index, value) => {
    setImageNames((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const clearImageSlot = (index) => {
    setImageFiles((prev) => {
      const copy = [...prev];
      copy[index] = null;
      return copy;
    });
    setImagePreviews((prev) => {
      const copy = [...prev];
      if (copy[index]) URL.revokeObjectURL(copy[index]);
      copy[index] = '';
      return copy;
    });
    setImageNames((prev) => {
      const copy = [...prev];
      copy[index] = '';
      return copy;
    });
  };

  useEffect(() => {
    setProductId(generateProductId());
    const unsubCategories = subscribeToCategories((rows) => setCategories(rows));
    const unsubSubcategories = subscribeToSubcategories((rows) => setSubcategories(rows));
    const unsubProducts = subscribeToAdminProducts((rows, error) => {
      setProducts(rows);
      setLoadError(error);
      setLoading(false);
    });
    return () => {
      unsubCategories();
      unsubSubcategories();
      unsubProducts();
    };
  }, []);

  const subcategoryOptions = useMemo(
    () => subcategories.filter((s) => s.categoryId === form.categoryId),
    [subcategories, form.categoryId]
  );

  const updateField = (field) => (event) => {
    const value = event.target.value;
    if (field === 'categoryId') {
      setForm((prev) => ({ ...prev, categoryId: value, subcategoryId: '' }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

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
    imagePreviews.forEach((preview) => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    });
    setImageFiles([null, null, null, null, null]);
    setImagePreviews(['', '', '', '', '']);
    setImageNames(['', '', '', '', '']);
    setProductId(generateProductId());
    setEditingProductId(null);
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

    const activeSlots = [0, 1, 2, 3, 4].filter(
      (idx) => imageFiles[idx] || imagePreviews[idx]
    );
    if (activeSlots.length < 3) {
      showToast('Please provide at least 3 images (max 5) for the product.');
      return;
    }

    for (const idx of activeSlots) {
      if (!imageNames[idx].trim()) {
        showToast(`Please enter a valid file name for Image Box ${idx + 1}.`);
        return;
      }
    }

    const category = categories.find((c) => c.id === form.categoryId);
    const subcategory = subcategories.find((s) => s.id === form.subcategoryId);
    setSaving(true);
    try {
      const uploadPromises = activeSlots.map(async (idx) => {
        const file = imageFiles[idx];
        const customName = imageNames[idx].trim();
        if (file) {
          const url = await uploadImageToExternalServer(file, customName);
          return {
            url,
            key: customName,
            name: file.name,
            size: file.size,
            type: file.type,
            isNew: true,
          };
        } else {
          return {
            url: imagePreviews[idx],
            key: customName,
            isNew: false,
          };
        }
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      const uploadedUrls = uploadedFiles.map((f) => f.url).filter(Boolean);

      await createAdminProduct({
        id: productId,
        title: form.title.trim(),
        description: form.description.trim(),
        hashtags: form.hashtagsInput
          .split(/[\s,]+/)
          .map((tag) => tag.trim())
          .filter(Boolean)
          .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)),
        categoryId: form.categoryId,
        categoryTitle: category?.title ?? '',
        subcategoryId: form.subcategoryId || null,
        subcategoryTitle: subcategory?.title ?? '',
        price: Number(form.price) || 0,
        hsnCode: form.hsnCode.trim(),
        colors,
        sizes,
        image: uploadedUrls[0],
        images: uploadedUrls,
      });

      // Save file metadata only for new uploads in Firebase Realtime Database
      const newUploads = uploadedFiles.filter((f) => f.isNew);
      const metaPromises = newUploads.map((f) => {
        return createFileMetadata({
          productId: productId,
          key: f.key,
          url: f.url,
          originalName: f.name,
          fileSize: f.size,
          contentType: f.type,
        });
      });
      await Promise.all(metaPromises);

      showToast(editingProductId ? 'Product updated.' : 'Product created.');
      resetForm();
    } catch (err) {
      showToast(err.message || 'Could not save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${product.title || product.name}"? This will remove all associated database records and images from R2 storage. This action cannot be undone.`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      await deleteProductAndImages(product);
      showToast('Product deleted.');
    } catch (err) {
      showToast(err.message || 'Could not delete product.');
    } finally {
      setSaving(false);
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-title-sm text-title-sm text-on-surface">
                {editingProductId ? 'Edit Product' : 'New Product'}
              </h2>
              {editingProductId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="font-label-caps text-label-caps text-error hover:underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2">
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
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                    Product ID (Auto-generated)
                  </label>
                  <input
                    readOnly
                    value={productId}
                    className="w-full bg-surface-container-low border border-outline-variant/60 rounded-lg px-4 py-3 font-mono text-body-md text-on-surface-variant cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="p-subcategory">
                    Subcategory (optional)
                  </label>
                  <select
                    id="p-subcategory"
                    value={form.subcategoryId}
                    onChange={updateField('subcategoryId')}
                    disabled={!form.categoryId || subcategoryOptions.length === 0}
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {form.categoryId && subcategoryOptions.length === 0 ? 'No subcategories yet' : 'None'}
                    </option>
                    {subcategoryOptions.map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.title}
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

              {/* Product Images (5 Slots) */}
              <div className="space-y-4 border border-outline-variant/35 rounded-xl p-5 bg-surface-container-low/40">
                <div>
                  <h3 className="font-title-sm text-[16px] text-on-surface">Product Images (Upload 3 to 5 images)</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    First image is the primary thumbnail. Filenames are customizable and automatically name-spaced to the Product ID.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {[0, 1, 2, 3, 4].map((index) => {
                    const preview = imagePreviews[index];
                    const fileName = imageNames[index];
                    const hasImage = !!imageFiles[index];

                    return (
                      <div key={index} className="flex flex-col gap-2 p-3 border border-outline-variant/40 rounded-lg bg-surface-container-lowest relative">
                        <div className="flex justify-between items-center">
                          <span className="font-label-caps text-[10px] text-on-surface-variant">Image Box {index + 1} {index < 3 && <span className="text-error font-bold">*</span>}</span>
                          {hasImage && (
                            <button
                              type="button"
                              onClick={() => clearImageSlot(index)}
                              className="text-error font-body-sm text-[10px] hover:underline"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {preview ? (
                          <div className="w-full aspect-[3/4] rounded-md overflow-hidden bg-surface-container border border-outline-variant/30 relative">
                            <img src={preview} className="w-full h-full object-cover" alt={`Preview ${index + 1}`} />
                          </div>
                        ) : (
                          <div 
                            onClick={() => document.getElementById(`image-file-input-${index}`).click()}
                            className="w-full aspect-[3/4] rounded-md border-2 border-dashed border-outline-variant/70 hover:border-primary/50 bg-surface-container-low flex flex-col items-center justify-center cursor-pointer transition-colors"
                          >
                            <span className="material-symbols-outlined text-[24px] text-outline">add_a_photo</span>
                            <span className="font-body-sm text-[10px] text-on-surface-variant/80 mt-1">Upload</span>
                          </div>
                        )}

                        <input
                          id={`image-file-input-${index}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageChange(index, e)}
                          className="hidden"
                        />

                        {hasImage && (
                          <div className="flex flex-col gap-1 mt-1">
                            <label className="font-body-sm text-[10px] text-on-surface-variant/80" htmlFor={`filename-${index}`}>
                              File Name
                            </label>
                            <input
                              id={`filename-${index}`}
                              type="text"
                              value={fileName}
                              onChange={(e) => handleImageNameChange(index, e.target.value)}
                              className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded px-2 py-1 font-mono text-[10px] text-on-surface"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                {saving ? 'Saving…' : (editingProductId ? 'Save Changes' : 'Add Product')}
              </button>
            </form>
          </section>
        )}

        {/* Product list */}
        <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4 border-b border-outline-variant/20 pb-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={products.length > 0 && selectedProductIds.length === products.length}
                onChange={toggleSelectAll}
                className="rounded border-outline w-5 h-5 text-primary focus:ring-primary cursor-pointer"
              />
              <h2 className="font-title-sm text-title-sm text-on-surface">
                All Products ({products.length})
              </h2>
            </div>
            {selectedProductIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="flex items-center gap-2 bg-error/10 hover:bg-error/20 text-error font-label-caps text-label-caps px-4 py-2.5 rounded-lg uppercase tracking-wider transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete Selected ({selectedProductIds.length})
              </button>
            )}
          </div>

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
                const isSelected = selectedProductIds.includes(product.id);
                return (
                  <div 
                    key={product.id} 
                    className={`border rounded-lg p-4 flex gap-4 items-start transition-colors ${
                      isSelected 
                        ? 'border-primary/50 bg-primary/5' 
                        : 'border-outline-variant/30 bg-surface-container-lowest'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectProduct(product.id)}
                      className="rounded border-outline w-5 h-5 text-primary focus:ring-primary cursor-pointer mt-1"
                    />

                    {product.image && (
                      <div className="w-16 h-20 rounded-lg overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/30 relative">
                        <img 
                          src={product.image} 
                          className={`w-full h-full object-cover ${totalStock === 0 ? 'grayscale opacity-60' : ''}`} 
                          alt={product.title} 
                        />
                        {totalStock === 0 && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[9px] font-bold uppercase tracking-wider">
                            OOS
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <h3 className="font-title-sm text-title-sm text-on-surface flex items-center gap-2">
                            {product.title}
                            {totalStock === 0 && (
                              <span className="text-[10px] font-bold bg-error/10 text-error px-2 py-0.5 rounded-full uppercase">
                                Out of Stock
                              </span>
                            )}
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {product.categoryTitle}
                            {product.subcategoryTitle ? ` / ${product.subcategoryTitle}` : ''} · {formatCurrency(product.price)} · HSN {product.hsnCode} · SKU {product.sku} · {product.images?.length || 1} images
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(product)}
                            className="font-label-caps text-label-caps text-primary hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setBarcodeProduct(product)}
                            className="font-label-caps text-label-caps text-primary hover:underline"
                          >
                            Print Barcode
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
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
                        Sizes: {(product.sizes ?? []).map((s) => `${s.size} (${s.stock})`).join(', ') || '—'} · Total stock: <span className={totalStock === 0 ? "text-error font-semibold" : ""}>{totalStock}</span>
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
