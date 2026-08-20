import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToCategories } from '../../services/categories.js';
import { subscribeToSubcategories } from '../../services/subcategories.js';
import { subscribeToAdminProducts, createAdminProduct, moveProductToTrash, createFileMetadata, updateProductOutOfStock, updateProductColorOutOfStock } from '../../services/adminProducts.js';
import { subscribeToCollections } from '../../services/collections.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatCurrency } from '../../context/CartContext.jsx';
import BarcodeModal from '../../components/admin/BarcodeModal.jsx';
import { isHeicFile, convertHeicFileToPng } from '../../utils/heic.js';
import { compressImageFile } from '../../utils/imageCompression.js';
import { getR2KeyFromUrl } from '../../utils/productImages.js';
import { getColorName, normalizeColors, isColorOutOfStock } from '../../utils/productColors.js';
import ProductImage from '../../components/ProductImage.jsx';

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
// Waist/chest sizing (in inches) for categories sold by inch size rather than
// S/M/L, e.g. Jeans and Shirts — steps of 2, matching how these are labeled
// on the garment tag.
const INCH_SIZES = Array.from({ length: (52 - 26) / 2 + 1 }, (_, i) => String(26 + i * 2));
const DEFAULT_PAGE_SIZE = 200;
const PAGE_SIZE_OPTIONS = [20, 50, 100, 200, 500];

const EMPTY_FORM = {
  title: '',
  description: '',
  hashtagsInput: '',
  categoryId: '',
  subcategoryId: '',
  price: '',
  hsnCode: '',
  gender: 'Unisex',
};

export default function AdminProductsPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sizes, setSizes] = useState([]); // [{ size, stock }]
  const [customSize, setCustomSize] = useState('');
  const [colorStocks, setColorStocks] = useState({}); // { [colorName]: { stock: '' | number, outOfStock: bool } }
  const [saving, setSaving] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [productId, setProductId] = useState('');
  const [imageFiles, setImageFiles] = useState([null, null, null, null, null]);
  const [imagePreviews, setImagePreviews] = useState(['', '', '', '', '']);
  const [imageNames, setImageNames] = useState(['', '', '', '', '']);
  const [imageColors, setImageColors] = useState(['', '', '', '', '']);
  const [displayImageIndex, setDisplayImageIndex] = useState(0);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [titleFilter, setTitleFilter] = useState('');
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [removedImageKeys, setRemovedImageKeys] = useState([]);
  const [collectionsList, setCollectionsList] = useState([]);
  const [genderFilter, setGenderFilter] = useState('All');
  const [colorFilter, setColorFilter] = useState('All');
  const [minPriceFilter, setMinPriceFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('All');


  // Rehydrates the per-color stock/out-of-stock editor from a saved product's
  // colors, tolerating the old plain-string shape (no stock recorded yet).
  const colorStocksFromProduct = (product) => {
    const next = {};
    normalizeColors(product.colors).forEach((c) => {
      if (!c.name) return;
      next[c.name] = { stock: c.stock === null ? '' : c.stock, outOfStock: c.outOfStock };
    });
    return next;
  };

  const handleStartEdit = (product) => {
    setEditingProductId(product.id);
    setIsDuplicating(false);
    setProductId(product.id);
    setForm({
      title: product.title || product.name || '',
      description: product.description || '',
      categoryId: product.categoryId || '',
      subcategoryId: product.subcategoryId || '',
      price: product.price || '',
      hsnCode: product.hsnCode || '',
      hashtagsInput: (product.hashtags ?? []).join(', '),
      gender: product.gender || 'Unisex',
    });
    setSizes(product.sizes ?? []);
    setColorStocks(colorStocksFromProduct(product));
    setImageFiles([null, null, null, null, null]);

    const initialPreviews = ['', '', '', '', ''];
    const initialNames = ['', '', '', '', ''];
    const initialColors = ['', '', '', '', ''];
    if (product.images && product.images.length > 0) {
      product.images.forEach((url, idx) => {
        if (idx < 5) {
          initialPreviews[idx] = url;
          initialNames[idx] = getR2KeyFromUrl(url) || '';
          initialColors[idx] = product.imageColors?.[idx] || '';
        }
      });
    } else if (product.image) {
      initialPreviews[0] = product.image;
      initialNames[0] = getR2KeyFromUrl(product.image) || '';
      initialColors[0] = product.imageColors?.[0] || getColorName(product.colors?.[0]) || '';
    }
    setImagePreviews(initialPreviews);
    setImageNames(initialNames);
    setImageColors(initialColors);
    setDisplayImageIndex(0);
    setRemovedImageKeys([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicate = (product) => {
    setEditingProductId(null);
    setIsDuplicating(true);
    setProductId(generateProductId());
    setForm({
      title: `${product.title || product.name || ''} (Copy)`,
      description: product.description || '',
      categoryId: product.categoryId || '',
      subcategoryId: product.subcategoryId || '',
      price: product.price || '',
      hsnCode: product.hsnCode || '',
      hashtagsInput: (product.hashtags ?? []).join(', '),
      gender: product.gender || 'Unisex',
    });
    setSizes(product.sizes ?? []);
    setColorStocks(colorStocksFromProduct(product));
    setImageFiles([null, null, null, null, null]);

    const initialPreviews = ['', '', '', '', ''];
    const initialNames = ['', '', '', '', ''];
    const initialColors = ['', '', '', '', ''];
    if (product.images && product.images.length > 0) {
      product.images.forEach((url, idx) => {
        if (idx < 5) {
          initialPreviews[idx] = url;
          initialNames[idx] = getR2KeyFromUrl(url) || '';
          initialColors[idx] = product.imageColors?.[idx] || '';
        }
      });
    } else if (product.image) {
      initialPreviews[0] = product.image;
      initialNames[0] = getR2KeyFromUrl(product.image) || '';
      initialColors[0] = product.imageColors?.[0] || getColorName(product.colors?.[0]) || '';
    }
    setImagePreviews(initialPreviews);
    setImageNames(initialNames);
    setImageColors(initialColors);
    setDisplayImageIndex(0);
    setRemovedImageKeys([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Duplicated — review the details and save to create a new product.');
  };

  const toggleSelectProduct = (id) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Selects/deselects only the products visible on the current page — with
  // pagination, silently selecting the entire catalog behind a "select all"
  // checkbox that only shows 20 products at a time would be a bulk-delete
  // footgun.
  const toggleSelectAllOnPage = () => {
    const pageIds = paginatedProducts.map((p) => p.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedProductIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handleBulkDuplicate = async () => {
    if (selectedProductIds.length === 0) return;
    const confirmed = window.confirm(
      `Duplicate the ${selectedProductIds.length} selected products? This will create ${selectedProductIds.length} new products with the same details, images, and stock.`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const selected = products.filter((p) => selectedProductIds.includes(p.id));
      await Promise.all(
        selected.map((product) =>
          createAdminProduct({
            id: generateProductId(),
            title: `${product.title || product.name || ''} (Copy)`,
            description: product.description || '',
            gender: product.gender || 'Unisex',
            hashtags: product.hashtags ?? [],
            categoryId: product.categoryId || '',
            categoryTitle: product.categoryTitle || '',
            subcategoryId: product.subcategoryId || null,
            subcategoryTitle: product.subcategoryTitle || '',
            price: product.price || 0,
            hsnCode: product.hsnCode || '',
            colors: product.colors ?? [],
            sizes: product.sizes ?? [],
            image: product.image || (product.images ?? [])[0],
            images: product.images ?? (product.image ? [product.image] : []),
            imageColors: product.imageColors ?? [],
          })
        )
      );
      showToast(`${selected.length} product${selected.length === 1 ? '' : 's'} duplicated.`);
      setSelectedProductIds([]);
    } catch (err) {
      showToast(err.message || 'Could not duplicate some products.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    const confirmed = window.confirm(
      `Move the ${selectedProductIds.length} selected products to Trash? You can restore them from there, or they'll be deleted for good after the configured retention period.`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const trashPromises = selectedProductIds.map(async (id) => {
        const product = products.find((p) => p.id === id);
        if (product) {
          await moveProductToTrash(product);
        }
      });
      await Promise.all(trashPromises);
      showToast(`${selectedProductIds.length} products moved to Trash.`);
      setSelectedProductIds([]);
    } catch (err) {
      showToast(err.message || 'Could not move some products to Trash.');
    } finally {
      setSaving(false);
    }
  };

  const generateProductId = () => `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const handleImageChange = async (index, e) => {
    let file = e.target.files?.[0];
    if (file) {
      if (isHeicFile(file)) {
        showToast('Converting HEIC photo…');
        try {
          file = await convertHeicFileToPng(file);
        } catch {
          showToast('Could not convert HEIC photo. Please try a JPG or PNG.');
          return;
        }
      }

      let compressed;
      try {
        showToast('Compressing image…');
        compressed = await compressImageFile(file);
      } catch (err) {
        console.error('Image compression failed', err);
        showToast('Could not compress this image. Please try a different file.');
        return;
      }

      const autoName = `${productId}_image_${index + 1}${compressed.extension}`;

      setImageFiles((prev) => {
        const copy = [...prev];
        copy[index] = compressed.file;
        return copy;
      });

      setImagePreviews((prev) => {
        const copy = [...prev];
        const previousUrl = copy[index];
        if (previousUrl) {
          if (previousUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previousUrl);
          } else if (!isDuplicating) {
            // Replacing an already-uploaded image — queue the old file for
            // deletion from R2 once the product save succeeds. Skipped while
            // duplicating: the pre-filled URL still belongs to the source
            // product, which hasn't been touched.
            const key = getR2KeyFromUrl(previousUrl);
            if (key) setRemovedImageKeys((keys) => [...keys, key]);
          }
        }
        copy[index] = compressed.previewUrl;
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

  const handleImageColorChange = (index, value) => {
    setImageColors((prev) => {
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
      const previousUrl = copy[index];
      if (previousUrl) {
        if (previousUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previousUrl);
        } else if (!isDuplicating) {
          // Skipped while duplicating: the pre-filled URL still belongs to
          // the source product, which hasn't been touched.
          const key = getR2KeyFromUrl(previousUrl);
          if (key) setRemovedImageKeys((keys) => [...keys, key]);
        }
      }
      copy[index] = '';
      return copy;
    });
    setImageNames((prev) => {
      const copy = [...prev];
      copy[index] = '';
      return copy;
    });
    setImageColors((prev) => {
      const copy = [...prev];
      copy[index] = '';
      return copy;
    });
  };

  const chooseDisplayImage = (index) => setDisplayImageIndex(index);

  useEffect(() => {
    setProductId(generateProductId());
    const unsubCategories = subscribeToCategories((rows) => setCategories(rows));
    const unsubSubcategories = subscribeToSubcategories((rows) => setSubcategories(rows));
    const unsubCollections = subscribeToCollections((rows) => setCollectionsList(rows));
    const unsubProducts = subscribeToAdminProducts((rows, error) => {
      setProducts(rows);
      setLoadError(error);
      setLoading(false);
    });
    return () => {
      unsubCategories();
      unsubSubcategories();
      unsubCollections();
      unsubProducts();
    };
  }, []);

  const subcategoryOptions = useMemo(
    () => subcategories.filter((s) => s.categoryId === form.categoryId),
    [subcategories, form.categoryId]
  );

  const colorOptions = useMemo(() => {
    const colors = new Set();
    products.forEach((p) => (p.colors ?? []).forEach((c) => {
      const name = getColorName(c);
      if (name) colors.add(name);
    }));
    return [...colors].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;

    const needle = titleFilter.trim().toLowerCase();
    if (needle) {
      result = result.filter((p) => (p.title || p.name || '').toLowerCase().includes(needle));
    }

    if (genderFilter !== 'All') {
      result = result.filter((p) => (p.gender || 'Unisex') === genderFilter);
    }

    if (colorFilter !== 'All') {
      result = result.filter((p) => (p.colors ?? []).some((c) => getColorName(c) === colorFilter));
    }

    const min = minPriceFilter !== '' ? Number(minPriceFilter) : null;
    const max = maxPriceFilter !== '' ? Number(maxPriceFilter) : null;
    if (min !== null) {
      result = result.filter((p) => Number(p.price) >= min);
    }
    if (max !== null) {
      result = result.filter((p) => Number(p.price) <= max);
    }

    if (collectionFilter !== 'All') {
      const collection = collectionsList.find((c) => c.id === collectionFilter);
      const idSet = new Set(collection?.productIds ?? []);
      result = result.filter((p) => idSet.has(p.id));
    }

    return result;
  }, [products, titleFilter, genderFilter, colorFilter, minPriceFilter, maxPriceFilter, collectionFilter, collectionsList]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [titleFilter, genderFilter, colorFilter, minPriceFilter, maxPriceFilter, collectionFilter, pageSize]);

  const paginatedProducts = useMemo(
    () => filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredProducts, currentPage, pageSize]
  );

  const updateField = (field) => (event) => {
    const value = event.target.value;
    if (field === 'categoryId') {
      setForm((prev) => ({ ...prev, categoryId: value, subcategoryId: '' }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addSize = (size) => {
    if (!size.trim() || sizes.some((s) => s.size === size)) return;
    setSizes((prev) => [...prev, { size, stock: 0 }]);
    setCustomSize('');
  };

  const updateSizeStock = (size, stock) => {
    setSizes((prev) => prev.map((s) => (s.size === size ? { ...s, stock: Math.max(0, Number(stock) || 0) } : s)));
  };

  const removeSize = (size) => setSizes((prev) => prev.filter((s) => s.size !== size));

  // The colors a product ships in are driven by the color tagged on each
  // uploaded image (imageColors). This mirrors that set so the "Colors &
  // Stock" section can offer a stock qty + out-of-stock toggle per color
  // without asking the admin to re-type color names a second time.
  const derivedColorNames = useMemo(
    () => [...new Set(imageColors.map((c) => c.trim()).filter(Boolean))],
    [imageColors]
  );

  const updateColorStock = (name, stock) => {
    setColorStocks((prev) => ({
      ...prev,
      [name]: { ...prev[name], stock: stock === '' ? '' : Math.max(0, Number(stock) || 0) },
    }));
  };

  const toggleColorOutOfStock = (name) => {
    setColorStocks((prev) => ({
      ...prev,
      [name]: { ...prev[name], outOfStock: !prev[name]?.outOfStock },
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSizes([]);
    setCustomSize('');
    setColorStocks({});
    imagePreviews.forEach((preview) => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    });
    setImageFiles([null, null, null, null, null]);
    setImagePreviews(['', '', '', '', '']);
    setImageNames(['', '', '', '', '']);
    setImageColors(['', '', '', '', '']);
    setDisplayImageIndex(0);
    setRemovedImageKeys([]);
    setProductId(generateProductId());
    setEditingProductId(null);
    setIsDuplicating(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.categoryId) {
      showToast('Select a category before adding a product.');
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
      if (!imageColors[idx].trim()) {
        showToast(`Please enter the color shown in Image Box ${idx + 1}.`);
        return;
      }
    }

    const category = categories.find((c) => c.id === form.categoryId);
    const subcategory = subcategories.find((s) => s.id === form.subcategoryId);
    setSaving(true);
    try {
      // Grids render whichever image lands first in the array, so the
      // admin-chosen display image is moved to the front here rather than
      // requiring images to be re-uploaded into Box 1.
      const displaySlot = activeSlots.includes(displayImageIndex) ? displayImageIndex : activeSlots[0];
      const orderedSlots = [displaySlot, ...activeSlots.filter((idx) => idx !== displaySlot)];
      const uploadPromises = orderedSlots.map(async (idx) => {
        const file = imageFiles[idx];
        const customName = imageNames[idx].trim();
        const color = imageColors[idx].trim();
        if (file) {
          const url = await uploadImageToExternalServer(file, customName);
          return {
            url,
            key: customName,
            color,
            name: file.name,
            size: file.size,
            type: file.type,
            isNew: true,
          };
        } else {
          return {
            url: imagePreviews[idx],
            key: customName,
            color,
            isNew: false,
          };
        }
      });

      const uploadedFiles = (await Promise.all(uploadPromises)).filter((f) => f.url);
      const uploadedUrls = uploadedFiles.map((f) => f.url);
      const uploadedColors = uploadedFiles.map((f) => f.color);
      const derivedColorNamesAtSubmit = [...new Set(uploadedColors.filter(Boolean))];
      const colorsPayload = derivedColorNamesAtSubmit.map((name) => {
        const entry = colorStocks[name];
        return {
          name,
          stock: !entry || entry.stock === '' || entry.stock === undefined ? null : Number(entry.stock),
          outOfStock: Boolean(entry?.outOfStock),
        };
      });

      await createAdminProduct({
        id: productId,
        title: form.title.trim(),
        description: form.description.trim(),
        gender: form.gender || 'Unisex',
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
        colors: colorsPayload,
        sizes,
        image: uploadedUrls[0],
        images: uploadedUrls,
        imageColors: uploadedColors,
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

      // Only now that the product record itself has saved successfully do we
      // remove the replaced/deleted images from R2 — deleting first and
      // failing the save would leave the product pointing at nothing.
      if (removedImageKeys.length > 0) {
        const apiUrl = import.meta.env.VITE_IMAGE_UPLOAD_API_URL;
        const deletePromises = removedImageKeys.map(async (key) => {
          if (!apiUrl) return;
          try {
            await fetch(`${apiUrl}/${key}`, { method: 'DELETE' });
          } catch (e) {
            console.error(`Failed to delete R2 file: ${key}`, e);
          }
        });
        await Promise.all(deletePromises);
      }

      showToast(editingProductId ? 'Product updated.' : 'Product created.');
      resetForm();
    } catch (err) {
      showToast(err.message || 'Could not save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleOutOfStock = async (product) => {
    const nextOutOfStock = !product.outOfStock;
    try {
      await updateProductOutOfStock(product.id, nextOutOfStock);
      showToast(nextOutOfStock ? 'Product marked as out of stock.' : 'Product marked as in stock.');
    } catch (err) {
      showToast(err.message || 'Could not update stock status.');
    }
  };

  const handleToggleColorOutOfStock = async (product, colorName, currentlyOutOfStock) => {
    const nextOutOfStock = !currentlyOutOfStock;
    try {
      await updateProductColorOutOfStock(product.id, colorName, nextOutOfStock);
      showToast(nextOutOfStock ? `${colorName} marked as out of stock.` : `${colorName} marked as in stock.`);
    } catch (err) {
      showToast(err.message || 'Could not update color stock status.');
    }
  };

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `Move "${product.title || product.name}" to Trash? You can restore it from there, or it'll be deleted for good after the configured retention period.`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      await moveProductToTrash(product);
      showToast('Product moved to Trash.');
    } catch (err) {
      showToast(err.message || 'Could not move product to Trash.');
    } finally {
      setSaving(false);
    }
  };

  const activeSlotIndices = [0, 1, 2, 3, 4].filter((idx) => imageFiles[idx] || imagePreviews[idx]);
  const effectiveDisplayIndex = activeSlotIndices.includes(displayImageIndex)
    ? displayImageIndex
    : activeSlotIndices[0] ?? 0;

  // Jeans and shirts are sold by waist/chest inch size rather than S/M/L —
  // swap in the inch-size quick-add buttons whenever the selected category
  // is one of those (but not e.g. T-Shirts, which still use S/M/L).
  const selectedCategoryTitle = (categories.find((c) => c.id === form.categoryId)?.title || '').toLowerCase();
  const usesInchSizes =
    selectedCategoryTitle.includes('jean') ||
    (selectedCategoryTitle.includes('shirt') && !selectedCategoryTitle.replace(/[\s-]/g, '').includes('tshirt'));
  const quickSizeOptions = usesInchSizes ? INCH_SIZES : QUICK_SIZES;

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
                {editingProductId ? 'Edit Product' : isDuplicating ? 'New Product (Duplicated)' : 'New Product'}
              </h2>
              {(editingProductId || isDuplicating) && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="font-label-caps text-label-caps text-error hover:underline"
                >
                  {isDuplicating ? 'Discard Draft' : 'Cancel Edit'}
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
                    Check "Display Image" under a photo to make it the primary thumbnail shown across the storefront. Filenames are customizable and automatically name-spaced to the Product ID.
                    Tag each photo with the color shown so the storefront color filter and swatches work correctly.
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
                            <ProductImage src={preview} className="w-full h-full object-cover" alt={`Preview ${index + 1}`} />
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
                          accept="image/*,.heic,.heif"
                          onChange={(e) => handleImageChange(index, e)}
                          className="hidden"
                        />

                        {(hasImage || preview) && (
                          <div className="flex flex-col gap-1 mt-1">
                            <label className="font-body-sm text-[10px] text-on-surface-variant/80" htmlFor={`color-${index}`}>
                              Color <span className="text-error font-bold">*</span>
                            </label>
                            <input
                              id={`color-${index}`}
                              type="text"
                              value={imageColors[index]}
                              onChange={(e) => handleImageColorChange(index, e.target.value)}
                              placeholder="e.g. Rani Pink"
                              className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded px-2 py-1 font-body-sm text-[11px] text-on-surface"
                            />
                          </div>
                        )}

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

                        {(hasImage || preview) && (
                          <label
                            htmlFor={`display-image-${index}`}
                            className="flex items-center gap-1.5 mt-1 cursor-pointer select-none"
                          >
                            <input
                              id={`display-image-${index}`}
                              type="checkbox"
                              checked={effectiveDisplayIndex === index}
                              onChange={() => chooseDisplayImage(index)}
                              className="rounded border-outline w-3.5 h-3.5 text-primary focus:ring-primary cursor-pointer"
                            />
                            <span className={`font-body-sm text-[10px] ${effectiveDisplayIndex === index ? 'text-primary font-semibold' : 'text-on-surface-variant/80'}`}>
                              Display Image
                            </span>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
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
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2" htmlFor="p-gender">
                    Gender
                  </label>
                  <select
                    id="p-gender"
                    required
                    value={form.gender}
                    onChange={updateField('gender')}
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Unisex">Unisex</option>
                  </select>
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

              {/* Sizes + stock */}
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                  Sizes &amp; Stock
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {quickSizeOptions.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => addSize(size)}
                      disabled={sizes.some((s) => s.size === size)}
                      className="px-4 py-2 rounded-full border border-outline-variant text-on-surface font-label-caps text-label-caps hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {usesInchSizes ? `${size}"` : size}
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

              {/* Colors + per-color stock */}
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                  Colors &amp; Stock
                </label>
                {derivedColorNames.length === 0 ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Tag a color on at least one image above to manage its stock here.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {derivedColorNames.map((name) => {
                      const entry = colorStocks[name] ?? { stock: '', outOfStock: false };
                      return (
                        <div key={name} className="flex items-center gap-3 border border-outline-variant/30 rounded-lg px-4 py-2">
                          <span className="font-body-sm text-body-sm text-on-surface w-32 truncate">{name}</span>
                          <label className="font-body-sm text-body-sm text-on-surface-variant" htmlFor={`color-stock-${name}`}>
                            Stock
                          </label>
                          <input
                            id={`color-stock-${name}`}
                            type="number"
                            min="0"
                            placeholder="Unlimited"
                            value={entry.stock}
                            onChange={(e) => updateColorStock(name, e.target.value)}
                            className="w-28 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-1 font-body-sm text-body-sm text-on-surface transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => toggleColorOutOfStock(name)}
                            className={`ml-auto font-label-caps text-label-caps hover:underline ${entry.outOfStock ? 'text-primary' : 'text-error'}`}
                          >
                            {entry.outOfStock ? 'Mark In Stock' : 'Mark Out of Stock'}
                          </button>
                        </div>
                      );
                    })}
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
                aria-label="Select all products on this page"
                checked={paginatedProducts.length > 0 && paginatedProducts.every((p) => selectedProductIds.includes(p.id))}
                onChange={toggleSelectAllOnPage}
                className="rounded border-outline w-5 h-5 text-primary focus:ring-primary cursor-pointer"
              />
              <h2 className="font-title-sm text-title-sm text-on-surface">
                All Products ({products.length})
              </h2>
              <span className="font-body-sm text-[11px] text-on-surface-variant">Select all on this page</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/super/trash"
                className="flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                View Trash
              </Link>
            {selectedProductIds.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBulkDuplicate}
                  disabled={saving}
                  className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary font-label-caps text-label-caps px-4 py-2.5 rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  Duplicate Selected ({selectedProductIds.length})
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={saving}
                  className="flex items-center gap-2 bg-error/10 hover:bg-error/20 text-error font-label-caps text-label-caps px-4 py-2.5 rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Move to Trash ({selectedProductIds.length})
                </button>
              </div>
            )}
            </div>
          </div>

          <div className="relative mb-4 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={titleFilter}
              onChange={(e) => setTitleFilter(e.target.value)}
              placeholder="Filter by title…"
              className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg pl-10 pr-4 py-2 font-body-sm text-body-sm text-on-surface transition-colors"
            />
            {titleFilter && (
              <p className="font-body-sm text-[11px] text-on-surface-variant mt-1">
                {filteredProducts.length} of {products.length} products match "{titleFilter.trim()}"
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div className="flex flex-col gap-1">
              <label className="font-body-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold" htmlFor="filter-gender">Gender</label>
              <select
                id="filter-gender"
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg pl-3 pr-8 py-2 font-body-sm text-body-sm text-on-surface transition-colors"
              >
                {['All', 'Male', 'Female', 'Unisex'].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-body-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold" htmlFor="filter-color">Color</label>
              <select
                id="filter-color"
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg pl-3 pr-8 py-2 font-body-sm text-body-sm text-on-surface transition-colors"
              >
                <option value="All">All</option>
                {colorOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-body-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold" htmlFor="filter-min-price">Min Price (₹)</label>
              <input
                id="filter-min-price"
                type="number"
                min={0}
                value={minPriceFilter}
                onChange={(e) => setMinPriceFilter(e.target.value)}
                placeholder="0"
                className="w-28 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-body-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold" htmlFor="filter-max-price">Max Price (₹)</label>
              <input
                id="filter-max-price"
                type="number"
                min={0}
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(e.target.value)}
                placeholder="Any"
                className="w-28 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface transition-colors"
              />
            </div>

            {collectionsList.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="font-body-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold" htmlFor="filter-collection">Collection</label>
                <select
                  id="filter-collection"
                  value={collectionFilter}
                  onChange={(e) => setCollectionFilter(e.target.value)}
                  className="bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg pl-3 pr-8 py-2 font-body-sm text-body-sm text-on-surface transition-colors"
                >
                  <option value="All">All</option>
                  {collectionsList.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {(genderFilter !== 'All' || colorFilter !== 'All' || minPriceFilter !== '' || maxPriceFilter !== '' || collectionFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setGenderFilter('All');
                  setColorFilter('All');
                  setMinPriceFilter('');
                  setMaxPriceFilter('');
                  setCollectionFilter('All');
                }}
                className="font-label-caps text-label-caps text-primary hover:underline py-2"
              >
                Clear Filters
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
          ) : filteredProducts.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">No products match "{titleFilter.trim()}".</p>
          ) : (
            <div className="flex flex-col gap-4">
              {paginatedProducts.map((product) => {
                const totalStock = (product.sizes ?? []).reduce((sum, s) => sum + (s.stock ?? 0), 0);
                const isOutOfStock = Boolean(product.outOfStock) || totalStock === 0;
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
                        <ProductImage
                          src={product.image}
                          className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
                          alt={product.title}
                        />
                        {isOutOfStock && (
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
                            {isOutOfStock && (
                              <span className="text-[10px] font-bold bg-error/10 text-error px-2 py-0.5 rounded-full uppercase">
                                Out of Stock
                              </span>
                            )}
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {product.categoryTitle}
                            {product.subcategoryTitle ? ` / ${product.subcategoryTitle}` : ''} · {formatCurrency(product.price)} · {product.gender || 'Unisex'} · HSN {product.hsnCode} · SKU {product.sku} · {product.images?.length || 1} images
                          </p>
                          <p className="font-body-sm text-[11px] text-on-surface-variant/70 font-mono">
                            ID: {product.id}
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
                            onClick={() => handleDuplicate(product)}
                            className="font-label-caps text-label-caps text-primary hover:underline"
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={() => setBarcodeProduct(product)}
                            className="font-label-caps text-label-caps text-primary hover:underline"
                          >
                            Print Barcode
                          </button>
                          <Link
                            to={`/super/product-videos?productId=${product.id}`}
                            className="font-label-caps text-label-caps text-primary hover:underline"
                          >
                            Add Video
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleToggleOutOfStock(product)}
                            className={`font-label-caps text-label-caps hover:underline ${product.outOfStock ? 'text-primary' : 'text-error'}`}
                          >
                            {product.outOfStock ? 'Mark In Stock' : 'Mark Out of Stock'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            className="font-label-caps text-label-caps text-error hover:underline"
                          >
                            Move to Trash
                          </button>
                        </div>
                      </div>
                      {(product.colors ?? []).length > 0 ? (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-body-sm text-body-sm text-on-surface-variant">Colors:</span>
                          {normalizeColors(product.colors).map((c) => {
                            const colorOut = isColorOutOfStock(c);
                            return (
                              <span
                                key={c.name}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-body-sm text-body-sm ${
                                  colorOut ? 'border-error/40 text-error' : 'border-outline-variant/40 text-on-surface-variant'
                                }`}
                              >
                                {c.name}{c.stock !== null ? ` (${c.stock})` : ''}
                                <button
                                  type="button"
                                  onClick={() => handleToggleColorOutOfStock(product, c.name, colorOut)}
                                  className="font-label-caps text-[10px] uppercase text-primary hover:underline"
                                >
                                  {colorOut ? 'Mark In Stock' : 'Mark Out'}
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Colors: —</p>
                      )}
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Sizes: {(product.sizes ?? []).map((s) => `${s.size} (${s.stock})`).join(', ') || '—'} · Total stock: <span className={isOutOfStock ? "text-error font-semibold" : ""}>{totalStock}</span>
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

          {!loading && !loadError && filteredProducts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-outline-variant/20">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Showing {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filteredProducts.length)} of {filteredProducts.length} products
              </p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                  Per page
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-2 py-1.5 font-body-sm text-body-sm text-on-surface"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="font-label-caps text-label-caps text-primary px-3 py-2 rounded-lg hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Prev
                    </button>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="font-label-caps text-label-caps text-primary px-3 py-2 rounded-lg hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {barcodeProduct && <BarcodeModal product={barcodeProduct} onClose={() => setBarcodeProduct(null)} />}
    </div>
  );
}
