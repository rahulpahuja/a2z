import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStorefrontTheme, DEFAULT_THEME } from '../../context/StorefrontThemeContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useProducts } from '../../context/ProductsContext.jsx';
import { subscribeToCarousel, saveCarousel, DEFAULT_CAROUSEL_SLIDES } from '../../services/carousel.js';
import { subscribeToCategories } from '../../services/categories.js';
import { subscribeToTopNav, saveTopNav, DEFAULT_TOP_NAV_LINKS } from '../../services/topNav.js';
import { compressImageFile } from '../../utils/imageCompression.js';
import { isHeicFile, convertHeicFileToPng } from '../../utils/heic.js';
import { isGifFile } from '../../utils/gif.js';
import './AdminConfiguratorPage.css';

// R2 Image Uploader Function (Hero Carousel slide images)
const uploadImageToExternalServer = async (file, customName, signal) => {
  const apiUrl = import.meta.env.VITE_IMAGE_UPLOAD_API_URL;
  if (apiUrl) {
    const formData = new FormData();
    formData.append('file', file, customName);

    const response = await fetch(`${apiUrl}/upload`, {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data.url;
  }

  // Simulate delay, but stay abortable so "Cancel" works in local/demo mode too.
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 800);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Upload cancelled', 'AbortError'));
    });
  });
  return `https://external-image-server.com/uploads/${customName}`;
};

// A hero slide's actual destination is always stored in `link` (a path
// string) so HomePage's <Link to={slide.link}> never has to know about link
// types. These helpers just offer a friendlier, structured way to build that
// path instead of hand-typing it, and infer the type back out of an old
// slide's saved link so editing shows the right picker option.
function inferLinkType(link) {
  if (!link) return 'products';
  if (link === '/') return 'home';
  if (link === '/products') return 'products';
  if (link.startsWith('/products?category=')) return 'category';
  if (link.startsWith('/product/')) return 'product';
  return 'custom';
}

function inferLinkCategory(link) {
  const match = link?.match(/^\/products\?category=(.+)$/);
  return match ? decodeURIComponent(match[1]) : '';
}

function inferLinkProductId(link) {
  const match = link?.match(/^\/product\/(.+)$/);
  return match ? match[1] : '';
}

function buildLink({ linkType, linkCategory, linkProductId, linkCustom }) {
  switch (linkType) {
    case 'home':
      return '/';
    case 'products':
      return '/products';
    case 'category':
      return linkCategory ? `/products?category=${encodeURIComponent(linkCategory)}` : '/products';
    case 'product':
      return linkProductId ? `/product/${linkProductId}` : '/products';
    case 'custom':
    default:
      return linkCustom || '/products';
  }
}

function withLinkFields(slide) {
  return {
    hideTitle: false,
    hideCta: false,
    linkType: inferLinkType(slide.link),
    linkCategory: inferLinkCategory(slide.link),
    linkProductId: inferLinkProductId(slide.link),
    linkCustom: slide.link || '',
    ...slide,
  };
}

const SURFACES = [
  { key: 'hero', label: 'Hero Carousel', icon: 'view_carousel' },
  { key: 'topnav', label: 'Top Navigation', icon: 'menu' },
  { key: 'listing', label: 'Listing Page', icon: 'grid_on' },
  { key: 'detail', label: 'Product Detail Page', icon: 'photo_size_select_large' },
  { key: 'global', label: 'Global Theme', icon: 'palette' },
  { key: 'videos', label: 'Video Lookbooks', icon: 'movie' },
];

export default function AdminConfiguratorPage() {
  const { theme, updateTheme, resetTheme, loading } = useStorefrontTheme();
  const { showToast } = useToast();
  const { products, categories } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();

  // Local form states (initialized when theme loads)
  const [form, setForm] = useState(DEFAULT_THEME);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSurface, setActiveSurfaceState] = useState(() => {
    const fromQuery = searchParams.get('surface');
    return SURFACES.some((s) => s.key === fromQuery) ? fromQuery : 'hero';
  });

  const setActiveSurface = (key) => {
    setActiveSurfaceState(key);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('surface', key);
      return next;
    });
  };

  // Diagnostic Test States
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagStatus, setDiagStatus] = useState(null); // 'running', 'passed', 'failed'
  const [diagResults, setDiagResults] = useState([]);
  const [productHasVideoMap, setProductHasVideoMap] = useState({});

  // Hero Carousel states
  const [heroSlides, setHeroSlides] = useState([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroSaving, setHeroSaving] = useState(false);
  const [uploadingSlideIdx, setUploadingSlideIdx] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null); // { idx, url } — local blob preview while an upload is in flight
  const [heroPreviewIdx, setHeroPreviewIdx] = useState(0);
  const uploadControllerRef = useRef(null);

  // Top Navigation states
  const [categoryRows, setCategoryRows] = useState([]); // {id, title} — source list for the nav link picker
  const [topNavLinks, setTopNavLinks] = useState(DEFAULT_TOP_NAV_LINKS);
  const [topNavLoading, setTopNavLoading] = useState(true);
  const [navSaving, setNavSaving] = useState(false);
  const [newLinkType, setNewLinkType] = useState('category');
  const [newLinkCategoryIds, setNewLinkCategoryIds] = useState([]);
  const [newLinkLabel, setNewLinkLabel] = useState('');

  useEffect(() => {
    if (products && products.length > 0) {
      const map = {};
      products.forEach((p) => {
        map[p.id] = (p.videos && p.videos.length > 0);
      });
      setProductHasVideoMap(map);
    }
  }, [products]);

  useEffect(() => {
    if (theme) {
      setForm(theme);
    }
  }, [theme]);

  useEffect(() => {
    const unsub = subscribeToCarousel((loadedSlides) => {
      const slidesCopy = [...loadedSlides];
      while (slidesCopy.length < 4) {
        const defaultSlide = DEFAULT_CAROUSEL_SLIDES[slidesCopy.length] || {
          id: `slide_${slidesCopy.length + 1}`,
          title: `Slide ${slidesCopy.length + 1}`,
          image: '',
          alt: '',
          cta: 'Shop Now',
          link: '/products',
        };
        slidesCopy.push(defaultSlide);
      }
      setHeroSlides(slidesCopy.slice(0, 4).map(withLinkFields));
      setHeroLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToCategories((rows) => setCategoryRows(rows));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToTopNav((links) => {
      setTopNavLinks(links);
      setTopNavLoading(false);
    });
    return unsub;
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await updateTheme(form);
      showToast('Storefront theme configurations saved successfully.');
    } catch (err) {
      showToast(err.message || 'Could not save theme configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset storefront theme configurations to default values?')) {
      setIsSaving(true);
      try {
        await resetTheme();
        setForm(DEFAULT_THEME);
        showToast('Storefront theme configurations reset to factory defaults.');
      } catch (err) {
        showToast(err.message || 'Could not reset theme configuration.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Hero Carousel handlers
  const handleHeroFieldChange = (index, field, value) => {
    setHeroSlides((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleHeroLinkFieldChange = (index, field, value) => {
    setHeroSlides((prev) => {
      const copy = [...prev];
      const nextSlide = { ...copy[index], [field]: value };
      nextSlide.link = buildLink(nextSlide);
      copy[index] = nextSlide;
      return copy;
    });
  };

  const handleHeroImageUpload = async (index, event) => {
    let file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const controller = new AbortController();
    uploadControllerRef.current = controller;
    setUploadingSlideIdx(index);

    let localPreviewUrl = null;
    try {
      if (isGifFile(file)) {
        // GIFs are uploaded as-is — running one through the compression
        // canvas would flatten it to a single static frame.
        localPreviewUrl = URL.createObjectURL(file);
        setUploadPreview({ idx: index, url: localPreviewUrl });

        showToast('Uploading animated GIF…');
        const customName = `carousel_slide_${index + 1}_${Date.now()}.gif`;
        const uploadedUrl = await uploadImageToExternalServer(file, customName, controller.signal);

        handleHeroFieldChange(index, 'image', uploadedUrl);
        showToast(`GIF for Slide ${index + 1} uploaded successfully!`);
        return;
      }

      if (isHeicFile(file)) {
        showToast('Converting HEIC image…');
        file = await convertHeicFileToPng(file);
      }

      showToast('Compressing image…');
      const compressed = await compressImageFile(file);
      localPreviewUrl = compressed.previewUrl;
      setUploadPreview({ idx: index, url: localPreviewUrl });

      showToast('Uploading to R2...');
      const customName = `carousel_slide_${index + 1}_${Date.now()}${compressed.extension}`;
      const uploadedUrl = await uploadImageToExternalServer(compressed.file, customName, controller.signal);

      handleHeroFieldChange(index, 'image', uploadedUrl);
      showToast(`Image for Slide ${index + 1} uploaded successfully!`);
    } catch (err) {
      if (err.name === 'AbortError') {
        showToast('Upload cancelled.');
      } else {
        console.error(err);
        showToast(err.message || 'Image upload failed.');
      }
    } finally {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      setUploadPreview(null);
      setUploadingSlideIdx(null);
      uploadControllerRef.current = null;
    }
  };

  const handleHeroCancelUpload = () => {
    uploadControllerRef.current?.abort();
  };

  const handleHeroSave = async () => {
    for (let i = 0; i < 4; i++) {
      if (!heroSlides[i].image.trim()) {
        showToast(`Please upload an image for Slide ${i + 1}.`);
        return;
      }
      if (!heroSlides[i].title.trim()) {
        showToast(`Please fill in the title for Slide ${i + 1}.`);
        return;
      }
    }
    setHeroSaving(true);
    try {
      await saveCarousel(heroSlides);
      showToast('Hero Carousel configuration saved successfully!');
    } catch (err) {
      showToast(err.message || 'Could not save carousel settings.');
    } finally {
      setHeroSaving(false);
    }
  };

  const handleHeroReset = () => {
    if (window.confirm('Are you sure you want to reset all slides to default demo configurations?')) {
      setHeroSlides(DEFAULT_CAROUSEL_SLIDES.map(withLinkFields));
      showToast('Reset to defaults. Remember to click Save to apply changes.');
    }
  };

  // Top Navigation handlers
  const handleAddNavLink = () => {
    if (newLinkType === 'category') {
      const titles = categoryRows.filter((c) => newLinkCategoryIds.includes(c.id)).map((c) => c.title);
      if (titles.length === 0) return;
      setTopNavLinks((prev) => [
        ...prev,
        { id: `nav_${Date.now()}`, label: newLinkLabel.trim() || titles.join(' + '), type: 'category', categories: titles },
      ]);
    } else {
      setTopNavLinks((prev) => [
        ...prev,
        { id: `nav_${Date.now()}`, label: newLinkLabel.trim() || 'All Products', type: 'all' },
      ]);
    }
    setNewLinkLabel('');
    setNewLinkCategoryIds([]);
  };

  const handleToggleNavLinkCategory = (categoryId) => {
    setNewLinkCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
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
    setNavSaving(true);
    try {
      await saveTopNav(topNavLinks);
      showToast('Top navigation bar updated.');
    } catch (err) {
      showToast(err.message || 'Could not save navigation links.');
    } finally {
      setNavSaving(false);
    }
  };

  // Programmatic Diagnostic Assertions Test Suite
  const runDiagnostics = async () => {
    setDiagStatus('running');
    setDiagResults([]);
    const results = [];

    const assert = (name, assertion) => {
      try {
        const passed = assertion();
        results.push({ name, status: passed ? 'pass' : 'fail', message: passed ? 'Assertion passed.' : 'Value mismatch.' });
        return passed;
      } catch (e) {
        results.push({ name, status: 'fail', message: e.message });
        return false;
      }
    };

    setIsSaving(true);
    try {
      // Test Case 1: Write Custom Parameters & Validate state
      const testParameters = {
        listingImgAspect: '16/9',
        listingImgSize: '80%',
        detailImgAspect: '1/1',
        galleryThumbW: '72px',
        galleryThumbH: '90px',
        borderRadius: '20px',
        borderRadiusSm: '10px',
        borderWidth: '3px',
        borderColor: '#ff0055',
        titleSizeListing: '17px',
        descSizeListing: '13px',
        priceSizeListing: '15px',
        titleSizeDetail: '33px',
        descSizeDetail: '17px',
        storeBgColor: '#121212',
        backdropFilter: 'blur(10px)',
        backdropBg: 'rgba(0,0,0,0.5)',
        itemsPerPage: 150,
        gridCols: 6,
        primaryColor: '#ff0055',
        themeMode: 'dark',
      };

      // Apply test parameters
      await updateTheme(testParameters);

      // Assert state updated
      assert('Theme state is populated with test configs', () => {
        const root = document.documentElement;
        return root.style.getPropertyValue('--custom-listing-img-aspect') === '16/9' &&
               root.style.getPropertyValue('--custom-border-color') === '#ff0055' &&
               root.style.getPropertyValue('--color-primary') === '#ff0055' &&
               root.classList.contains('dark');
      });

      // Assert DOM variables update
      assert('DOM Root contains correct --custom-listing-img-aspect value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-listing-img-aspect');
        return value === '16/9';
      });

      assert('DOM Root contains correct --custom-listing-img-size value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-listing-img-size');
        return value === '80%';
      });

      assert('DOM Root contains correct --custom-border-radius value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-border-radius');
        return value === '20px';
      });

      assert('DOM Root contains correct --custom-border-width value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-border-width');
        return value === '3px';
      });

      assert('DOM Root contains correct --custom-font-title-size value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-font-title-size');
        return value === '17px';
      });

      assert('DOM Root contains correct --custom-store-bg value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-store-bg');
        return value === '#121212';
      });

      assert('DOM Root contains correct --custom-grid-cols value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-grid-cols');
        return value === '6';
      });

      assert('DOM Root contains correct --color-primary value', () => {
        const value = document.documentElement.style.getPropertyValue('--color-primary');
        return value === '#ff0055';
      });

      // Test Case 2: Reset and check defaults
      await resetTheme();
      assert('Resetting parameters restores default --custom-listing-img-aspect value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-listing-img-aspect');
        return value === DEFAULT_THEME.listingImgAspect;
      });

      assert('Resetting parameters restores default --custom-listing-img-size value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-listing-img-size');
        return value === DEFAULT_THEME.listingImgSize;
      });

      assert('Resetting parameters restores default --custom-border-radius value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-border-radius');
        return value === DEFAULT_THEME.borderRadius;
      });

      // Restore form state
      await updateTheme(form);

      const allPassed = results.every((r) => r.status === 'pass');
      setDiagResults(results);
      setDiagStatus(allPassed ? 'passed' : 'failed');
      if (allPassed) {
        showToast('Storefront theme diagnostic checks passed successfully.');
      } else {
        showToast('Diagnostic checks completed with failure assertions.');
      }
    } catch (e) {
      results.push({ name: 'System Process Execution', status: 'fail', message: e.message });
      setDiagResults(results);
      setDiagStatus('failed');
      showToast(`Diagnostic Execution Error: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-container flex items-center justify-center min-h-[60vh] text-on-surface-variant">
        Loading Configurator Portal...
      </div>
    );
  }

  const isDarkish = form.themeMode === 'dark' || form.themeMode === 'midnight';
  const surfaceCardBg = form.themeMode === 'dark' ? '#1e1e1e' : form.themeMode === 'midnight' ? '#0b0f19' : 'var(--color-surface-container-lowest, #ffffff)';
  const themeSurfaces = ['listing', 'detail', 'global', 'videos'];

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <h1 className="admin-page-title">Storefront Configurator Portal</h1>
        <p className="admin-page-subtitle">
          Pick a storefront page below, adjust its settings, and watch the preview on the right update immediately.
        </p>
      </header>

      <main className="admin-main-container flex flex-col gap-8">

        {/* Surface picker — this single control drives both which settings show and which preview shows */}
        <div className="surface-tabbar grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-surface-container rounded-xl p-1.5 border border-outline-variant/35">
          {SURFACES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveSurface(s.key)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg transition-all text-center font-label-caps text-[10px] uppercase ${
                activeSurface === s.key
                  ? 'bg-surface shadow text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Configuration form and Live Preview for the active surface */}
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Settings for the active surface */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {activeSurface === 'hero' && (
                <div className="admin-card flex flex-col gap-5">
                  <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">view_carousel</span>
                    Homepage Hero Carousel
                  </h3>
                  <p className="text-[10px] text-on-surface-variant/60 -mt-2">
                    Recommended: 1920x1080px (16:9) or 1920x800px widescreen images. Animated GIFs upload as-is, preserving the animation.
                  </p>

                  {heroLoading ? (
                    <p className="text-[12px] text-on-surface-variant">Loading…</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {heroSlides.map((slide, idx) => {
                        const isUploading = uploadingSlideIdx === idx;
                        return (
                          <div key={slide.id || idx} className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 flex flex-col gap-3">
                            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                              <h4 className="font-title-sm text-[12px] text-primary font-bold uppercase tracking-wider">Slide {idx + 1}</h4>
                              <button
                                type="button"
                                onClick={() => setHeroPreviewIdx(idx)}
                                className={`text-[10px] uppercase font-label-caps px-2 py-1 rounded transition-colors ${
                                  heroPreviewIdx === idx ? 'bg-primary text-on-primary' : 'text-primary bg-primary/5 border border-primary/25'
                                }`}
                              >
                                Preview
                              </button>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 items-center">
                              <div className="w-full sm:w-32 aspect-video rounded-lg bg-surface-container overflow-hidden border border-outline-variant/40 relative shrink-0">
                                {(isUploading && uploadPreview?.idx === idx ? uploadPreview.url : slide.image) ? (
                                  <img
                                    src={isUploading && uploadPreview?.idx === idx ? uploadPreview.url : slide.image}
                                    alt={`Slide ${idx + 1} Thumbnail`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = 'https://placehold.co/300x180?text=Image+Unavailable';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant/40 bg-surface-container-high">
                                    <span className="material-symbols-outlined text-[24px]">image</span>
                                  </div>
                                )}
                                {isUploading && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <span className="animate-spin inline-block w-5 h-5 border-2 border-t-transparent border-white rounded-full"></span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 w-full flex flex-col gap-2">
                                {isUploading ? (
                                  <button
                                    type="button"
                                    onClick={handleHeroCancelUpload}
                                    className="border border-error text-error font-label-caps text-[10px] px-3 py-2 rounded hover:bg-error/10 uppercase transition-colors"
                                  >
                                    Cancel Upload
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => document.getElementById(`hero-upload-${idx}`).click()}
                                    disabled={uploadingSlideIdx !== null}
                                    className="bg-primary-container text-on-primary-container font-label-caps text-[10px] px-3 py-2 rounded hover:opacity-90 uppercase transition-opacity border border-outline-variant/20 disabled:opacity-50"
                                  >
                                    {slide.image ? 'Replace Image' : 'Upload Image'}
                                  </button>
                                )}
                                <input
                                  id={`hero-upload-${idx}`}
                                  type="file"
                                  accept="image/*,.heic,.heif"
                                  onChange={(e) => handleHeroImageUpload(idx, e)}
                                  className="hidden"
                                />
                              </div>
                            </div>

                            <div className="form-group">
                              <label className="form-label text-[11px]" htmlFor={`hero-title-${idx}`}>Headline / Title</label>
                              <input
                                id={`hero-title-${idx}`}
                                type="text"
                                value={slide.title}
                                onChange={(e) => handleHeroFieldChange(idx, 'title', e.target.value)}
                                placeholder="e.g. The Festive Collection"
                                className="form-input text-[12px] py-2 px-3"
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label text-[11px]" htmlFor={`hero-alt-${idx}`}>Image Alt Description</label>
                              <input
                                id={`hero-alt-${idx}`}
                                type="text"
                                value={slide.alt}
                                onChange={(e) => handleHeroFieldChange(idx, 'alt', e.target.value)}
                                placeholder="Describe what is shown…"
                                className="form-input text-[12px] py-2 px-3"
                              />
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                              <label className="flex items-center gap-2 text-[11px] text-on-surface-variant cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!slide.hideTitle}
                                  onChange={(e) => handleHeroFieldChange(idx, 'hideTitle', e.target.checked)}
                                  className="accent-primary"
                                />
                                Hide headline
                              </label>
                              <label className="flex items-center gap-2 text-[11px] text-on-surface-variant cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!slide.hideCta}
                                  onChange={(e) => handleHeroFieldChange(idx, 'hideCta', e.target.checked)}
                                  className="accent-primary"
                                />
                                Hide CTA button
                              </label>
                            </div>

                            {!slide.hideCta && (
                              <div className="form-group">
                                <label className="form-label text-[11px]" htmlFor={`hero-cta-${idx}`}>Button CTA Label</label>
                                <input
                                  id={`hero-cta-${idx}`}
                                  type="text"
                                  value={slide.cta}
                                  onChange={(e) => handleHeroFieldChange(idx, 'cta', e.target.value)}
                                  placeholder="e.g. Shop Now"
                                  className="form-input text-[12px] py-2 px-3"
                                />
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="form-group">
                                <label className="form-label text-[11px]" htmlFor={`hero-link-type-${idx}`}>Where should this slide land?</label>
                                <select
                                  id={`hero-link-type-${idx}`}
                                  value={slide.linkType || 'products'}
                                  onChange={(e) => handleHeroLinkFieldChange(idx, 'linkType', e.target.value)}
                                  className="form-select text-[12px] py-2 px-3"
                                >
                                  <option value="home">Home Page</option>
                                  <option value="products">All Products</option>
                                  <option value="category">A Specific Category</option>
                                  <option value="product">A Specific Product</option>
                                  <option value="custom">Custom URL</option>
                                </select>
                              </div>

                              {slide.linkType === 'category' && (
                                <div className="form-group">
                                  <label className="form-label text-[11px]" htmlFor={`hero-link-cat-${idx}`}>Category</label>
                                  <select
                                    id={`hero-link-cat-${idx}`}
                                    value={slide.linkCategory || ''}
                                    onChange={(e) => handleHeroLinkFieldChange(idx, 'linkCategory', e.target.value)}
                                    className="form-select text-[12px] py-2 px-3"
                                  >
                                    <option value="">-- Choose Category --</option>
                                    {categories.filter((c) => c !== 'All').map((c) => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {slide.linkType === 'product' && (
                                <div className="form-group">
                                  <label className="form-label text-[11px]" htmlFor={`hero-link-prod-${idx}`}>Product</label>
                                  <select
                                    id={`hero-link-prod-${idx}`}
                                    value={slide.linkProductId || ''}
                                    onChange={(e) => handleHeroLinkFieldChange(idx, 'linkProductId', e.target.value)}
                                    className="form-select text-[12px] py-2 px-3"
                                  >
                                    <option value="">-- Choose Product --</option>
                                    {products.map((p) => (
                                      <option key={p.id} value={p.id}>{p.name || p.title}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {slide.linkType === 'custom' && (
                                <div className="form-group">
                                  <label className="form-label text-[11px]" htmlFor={`hero-link-custom-${idx}`}>Custom Path</label>
                                  <input
                                    id={`hero-link-custom-${idx}`}
                                    type="text"
                                    value={slide.linkCustom || ''}
                                    onChange={(e) => handleHeroLinkFieldChange(idx, 'linkCustom', e.target.value)}
                                    placeholder="e.g. /about-us"
                                    className="form-input text-[12px] py-2 px-3"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-3 justify-start pt-2 border-t border-outline-variant/20">
                    <button type="button" onClick={handleHeroReset} disabled={heroSaving} className="btn btn-secondary py-2.5 px-5 text-[11px]">
                      Reset Defaults
                    </button>
                    <button type="button" onClick={handleHeroSave} disabled={heroSaving} className="btn btn-primary py-2.5 px-5 text-[11px]">
                      {heroSaving ? 'Saving…' : 'Save Hero Carousel'}
                    </button>
                  </div>
                </div>
              )}

              {activeSurface === 'topnav' && (
                <div className="admin-card flex flex-col gap-5">
                  <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">menu</span>
                    Top Navigation Bar
                  </h3>
                  <p className="text-[10px] text-on-surface-variant/60 -mt-2">
                    Choose which links appear in the header and mobile menu, built only from categories that already exist.
                  </p>

                  {topNavLoading ? (
                    <p className="text-[12px] text-on-surface-variant">Loading…</p>
                  ) : (
                    <>
                      {topNavLinks.length === 0 ? (
                        <p className="text-[12px] text-on-surface-variant">No nav links yet — add one below.</p>
                      ) : (
                        <ul className="divide-y divide-outline-variant/20">
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
                                className="form-input text-[12px] py-2 px-3 flex-1"
                              />
                              <span className="text-[10px] text-on-surface-variant/70 font-mono shrink-0 whitespace-nowrap">
                                {link.type === 'all' ? 'All Products' : (link.categories?.length ? link.categories.join(', ') : link.category)}
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
                        <div className="form-group">
                          <label className="form-label text-[11px]">Link Type</label>
                          <select value={newLinkType} onChange={(e) => setNewLinkType(e.target.value)} className="form-select text-[12px] py-2 px-3">
                            <option value="category">Existing Category</option>
                            <option value="all">All Products (New Arrivals)</option>
                          </select>
                        </div>

                        {newLinkType === 'category' && (
                          <div className="form-group flex-1">
                            <label className="form-label text-[11px]">Categories</label>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 border border-outline-variant/40 rounded-lg px-3 py-2.5">
                              {categoryRows.map((c) => (
                                <label key={c.id} className="flex items-center gap-1.5 text-[12px] text-on-surface cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={newLinkCategoryIds.includes(c.id)}
                                    onChange={() => handleToggleNavLinkCategory(c.id)}
                                    className="filter-checkbox rounded border-outline w-4 h-4 text-primary focus:ring-primary"
                                  />
                                  {c.title}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="form-group flex-1">
                          <label className="form-label text-[11px]">Label (optional override)</label>
                          <input
                            value={newLinkLabel}
                            onChange={(e) => setNewLinkLabel(e.target.value)}
                            placeholder="e.g. Sarees"
                            className="form-input text-[12px] py-2 px-3"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleAddNavLink}
                          disabled={newLinkType === 'category' && newLinkCategoryIds.length === 0}
                          className="bg-primary-container text-on-primary-container font-label-caps text-[11px] px-5 py-2.5 rounded-lg uppercase hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                        >
                          Add Link
                        </button>
                      </div>

                      <div className="flex gap-3 justify-start pt-2">
                        <button type="button" onClick={handleSaveNavLinks} disabled={navSaving} className="btn btn-primary py-2.5 px-5 text-[11px]">
                          {navSaving ? 'Saving…' : 'Save Navigation'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeSurface === 'listing' && (
                <>
                  <div className="admin-card flex flex-col gap-5">
                    <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">aspect_ratio</span>
                      Image &amp; Grid Sizing
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="form-label" htmlFor="listing-aspect">Listing Grid Image Aspect Ratio</label>
                        <select
                          id="listing-aspect"
                          value={form.listingImgAspect}
                          onChange={(e) => handleChange('listingImgAspect', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="3/4">Portrait (3:4 - Recommended)</option>
                          <option value="1/1">Square (1:1)</option>
                          <option value="4/3">Landscape (4:3)</option>
                          <option value="16/9">Widescreen (16:9)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="listing-img-size">Listing Grid Card Size</label>
                        <select
                          id="listing-img-size"
                          value={form.listingImgSize || '100%'}
                          onChange={(e) => handleChange('listingImgSize', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="80%">Small (80%)</option>
                          <option value="90%">Medium (90%)</option>
                          <option value="100%">Full Width (Default)</option>
                        </select>
                        <p className="text-[10px] text-on-surface-variant/60 mt-1">
                          Shrinks the whole product card within its grid cell. To make cards bigger, reduce grid columns instead.
                        </p>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="items-per-page">Max Items Per Page</label>
                        <input
                          id="items-per-page"
                          type="number"
                          min="50"
                          value={form.itemsPerPage || 400}
                          onChange={(e) => handleChange('itemsPerPage', Math.max(50, Number(e.target.value)))}
                          required
                          className="form-input text-[12px] py-2 px-3"
                        />
                        <p className="text-[10px] text-on-surface-variant/60 mt-1">Must be at least 50.</p>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="grid-cols">Desktop Grid Columns</label>
                        <select
                          id="grid-cols"
                          value={form.gridCols || 4}
                          onChange={(e) => handleChange('gridCols', Number(e.target.value))}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value={4}>4 items in a row (Default)</option>
                          <option value={5}>5 items in a row</option>
                          <option value={6}>6 items in a row</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="admin-card flex flex-col gap-5">
                    <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">format_size</span>
                      Card Typography
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="form-label" htmlFor="title-size-list">Title Size</label>
                        <select
                          id="title-size-list"
                          value={form.titleSizeListing}
                          onChange={(e) => handleChange('titleSizeListing', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="12px">Compact (12px)</option>
                          <option value="14px">Regular (14px - Default)</option>
                          <option value="16px">Semibold (16px)</option>
                          <option value="18px">Large (18px)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="desc-size-list">Description Size</label>
                        <select
                          id="desc-size-list"
                          value={form.descSizeListing}
                          onChange={(e) => handleChange('descSizeListing', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="10px">Extra Small (10px)</option>
                          <option value="11px">Small (11px)</option>
                          <option value="12px">Regular (12px - Default)</option>
                          <option value="13px">Medium (13px)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="price-size-list">Price Size</label>
                        <select
                          id="price-size-list"
                          value={form.priceSizeListing}
                          onChange={(e) => handleChange('priceSizeListing', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="12px">Regular (12px)</option>
                          <option value="14px">Semibold (14px - Default)</option>
                          <option value="16px">Large (16px)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="admin-card flex flex-col gap-5">
                    <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">border_outer</span>
                      Card Border
                    </h3>
                    <p className="text-[10px] text-on-surface-variant/60 -mt-2">
                      Also styles the Product Detail Page main image border — the two stay in sync.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="form-label" htmlFor="border-radius">Border Radius</label>
                        <select
                          id="border-radius"
                          value={form.borderRadius}
                          onChange={(e) => handleChange('borderRadius', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="0px">Sharp Corner (0px)</option>
                          <option value="8px">Rounded Soft (8px)</option>
                          <option value="12px">Rounded Elegant (12px)</option>
                          <option value="16px">Luxury Curve (16px - Default)</option>
                          <option value="24px">Pill Corner (24px)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="border-width">Border Width</label>
                        <select
                          id="border-width"
                          value={form.borderWidth}
                          onChange={(e) => handleChange('borderWidth', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="0px">None (0px)</option>
                          <option value="1px">Thin (1px - Default)</option>
                          <option value="2px">Medium (2px)</option>
                          <option value="3px">Thick (3px)</option>
                        </select>
                      </div>

                      <div className="form-group sm:col-span-2">
                        <label className="form-label">Border Color</label>
                        <div className="color-picker-wrapper">
                          <input
                            type="color"
                            value={form.borderColor.startsWith('#') ? form.borderColor : '#DCAE96'}
                            onChange={(e) => handleChange('borderColor', e.target.value)}
                            className="color-picker-input"
                          />
                          <input
                            type="text"
                            value={form.borderColor}
                            onChange={(e) => handleChange('borderColor', e.target.value)}
                            placeholder="#DCAE96"
                            className="form-input text-[12px] py-1.5 px-3 flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeSurface === 'detail' && (
                <>
                  <div className="admin-card flex flex-col gap-5">
                    <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">aspect_ratio</span>
                      Image Dimensions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="form-label" htmlFor="detail-aspect">Main Image Aspect Ratio</label>
                        <select
                          id="detail-aspect"
                          value={form.detailImgAspect}
                          onChange={(e) => handleChange('detailImgAspect', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="3/4">Portrait (3:4)</option>
                          <option value="1/1">Square (1:1 - Recommended)</option>
                          <option value="4/3">Landscape (4:3)</option>
                        </select>
                      </div>

                      <div />

                      <div className="form-group">
                        <label className="form-label" htmlFor="gallery-thumb-w">Gallery Thumbnail Width</label>
                        <select
                          id="gallery-thumb-w"
                          value={form.galleryThumbW}
                          onChange={(e) => handleChange('galleryThumbW', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="56px">56px</option>
                          <option value="64px">64px (Default)</option>
                          <option value="72px">72px</option>
                          <option value="80px">80px</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="gallery-thumb-h">Gallery Thumbnail Height</label>
                        <select
                          id="gallery-thumb-h"
                          value={form.galleryThumbH}
                          onChange={(e) => handleChange('galleryThumbH', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="70px">70px</option>
                          <option value="80px">80px (Default)</option>
                          <option value="90px">90px</option>
                          <option value="100px">100px</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="admin-card flex flex-col gap-5">
                    <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">format_size</span>
                      Detail Typography
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="form-label" htmlFor="title-size-detail">Main Title Size</label>
                        <select
                          id="title-size-detail"
                          value={form.titleSizeDetail}
                          onChange={(e) => handleChange('titleSizeDetail', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="20px">Small (20px)</option>
                          <option value="24px">Medium (24px)</option>
                          <option value="28px">Regular (28px - Default)</option>
                          <option value="32px">Display (32px)</option>
                          <option value="36px">Headline (36px)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="desc-size-detail">Description Paragraph Size</label>
                        <select
                          id="desc-size-detail"
                          value={form.descSizeDetail}
                          onChange={(e) => handleChange('descSizeDetail', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="13px">Small (13px)</option>
                          <option value="14px">Medium (14px)</option>
                          <option value="15px">Regular (15px)</option>
                          <option value="16px">Comfortable (16px - Default)</option>
                          <option value="18px">Spacious (18px)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="admin-card flex flex-col gap-5">
                    <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">border_outer</span>
                      Image Border
                    </h3>
                    <p className="text-[10px] text-on-surface-variant/60 -mt-2">
                      Radius, width &amp; color are shared with the Listing Page card border — edit here or there, both update.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="form-label" htmlFor="border-radius-detail">Main Image Border Radius</label>
                        <select
                          id="border-radius-detail"
                          value={form.borderRadius}
                          onChange={(e) => handleChange('borderRadius', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="0px">Sharp Corner (0px)</option>
                          <option value="8px">Rounded Soft (8px)</option>
                          <option value="12px">Rounded Elegant (12px)</option>
                          <option value="16px">Luxury Curve (16px - Default)</option>
                          <option value="24px">Pill Corner (24px)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="border-radius-sm">Thumbnail Border Radius</label>
                        <select
                          id="border-radius-sm"
                          value={form.borderRadiusSm}
                          onChange={(e) => handleChange('borderRadiusSm', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="0px">Sharp Corner (0px)</option>
                          <option value="4px">Extra Small (4px)</option>
                          <option value="6px">Small (6px)</option>
                          <option value="8px">Medium (8px - Default)</option>
                          <option value="12px">Large (12px)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="border-width-detail">Border Width</label>
                        <select
                          id="border-width-detail"
                          value={form.borderWidth}
                          onChange={(e) => handleChange('borderWidth', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="0px">None (0px)</option>
                          <option value="1px">Thin (1px - Default)</option>
                          <option value="2px">Medium (2px)</option>
                          <option value="3px">Thick (3px)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Border Color</label>
                        <div className="color-picker-wrapper">
                          <input
                            type="color"
                            value={form.borderColor.startsWith('#') ? form.borderColor : '#DCAE96'}
                            onChange={(e) => handleChange('borderColor', e.target.value)}
                            className="color-picker-input"
                          />
                          <input
                            type="text"
                            value={form.borderColor}
                            onChange={(e) => handleChange('borderColor', e.target.value)}
                            placeholder="#DCAE96"
                            className="form-input text-[12px] py-1.5 px-3 flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeSurface === 'global' && (
                <>
                  <div className="admin-card flex flex-col gap-5">
                    <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">palette</span>
                      Backgrounds &amp; Backdrop Filters
                    </h3>
                    <p className="text-[10px] text-on-surface-variant/60 -mt-2">
                      These settings apply site-wide, across every storefront page.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="form-group sm:col-span-2">
                        <label className="form-label font-semibold" htmlFor="theme-mode">Base Theme Mode</label>
                        <select
                          id="theme-mode"
                          value={form.themeMode || 'light'}
                          onChange={(e) => handleChange('themeMode', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="light">Light Theme (Classic)</option>
                          <option value="dark">Dark Theme (Modern Sleek)</option>
                          <option value="midnight">Midnight Theme (Deep Luxury Blue/Black)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Main Store Background Color</label>
                        <div className="color-picker-wrapper">
                          <input
                            type="color"
                            value={form.storeBgColor.startsWith('#') ? form.storeBgColor : '#ffffff'}
                            onChange={(e) => handleChange('storeBgColor', e.target.value)}
                            className="color-picker-input"
                          />
                          <input
                            type="text"
                            value={form.storeBgColor}
                            onChange={(e) => handleChange('storeBgColor', e.target.value)}
                            placeholder="#ffffff"
                            className="form-input text-[12px] py-1.5 px-3 flex-1"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="backdrop-filter">Backdrop Glass Filter (blur)</label>
                        <select
                          id="backdrop-filter"
                          value={form.backdropFilter}
                          onChange={(e) => handleChange('backdropFilter', e.target.value)}
                          className="form-select text-[12px] py-2 px-3"
                        >
                          <option value="none">None (No blur)</option>
                          <option value="blur(4px)">Subtle blur (4px)</option>
                          <option value="blur(8px)">Medium blur (8px)</option>
                          <option value="blur(16px)">Glassmorphism (16px)</option>
                        </select>
                      </div>

                      <div className="form-group sm:col-span-2">
                        <label className="form-label" htmlFor="backdrop-bg">Backdrop Overlay Background / Gradient Style</label>
                        <input
                          id="backdrop-bg"
                          type="text"
                          value={form.backdropBg}
                          onChange={(e) => handleChange('backdropBg', e.target.value)}
                          placeholder="e.g. rgba(255,255,255,0.85) or linear-gradient(180deg, #fff, #f5f5f5)"
                          className="form-input text-[12px] py-2 px-3"
                        />
                        <p className="text-[10px] text-on-surface-variant/60 mt-1">
                          Accepts CSS transparency overlays (RGBA) or gradients applied behind galleries, detail layouts, or listings.
                        </p>
                      </div>

                      <div className="form-group sm:col-span-2 border-t border-outline-variant/20 pt-4 mt-2">
                        <label className="form-label font-semibold text-primary">Branding Theme Primary Color (Site-wide highlights)</label>
                        <div className="flex flex-col gap-3">
                          <div className="color-picker-wrapper">
                            <input
                              type="color"
                              value={form.primaryColor?.startsWith('#') ? form.primaryColor : '#ac2471'}
                              onChange={(e) => handleChange('primaryColor', e.target.value)}
                              className="color-picker-input"
                            />
                            <input
                              type="text"
                              value={form.primaryColor || '#ac2471'}
                              onChange={(e) => handleChange('primaryColor', e.target.value)}
                              placeholder="#ac2471"
                              className="form-input text-[12px] py-1.5 px-3 flex-1"
                            />
                          </div>

                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-[10px] text-on-surface-variant font-mono mr-1">Presets:</span>
                            {[
                              { label: 'Royal Pink', hex: '#ac2471' },
                              { label: 'Luxury Gold', hex: '#c5a880' },
                              { label: 'Indigo Royal', hex: '#3f51b5' },
                              { label: 'Emerald Teal', hex: '#008080' },
                              { label: 'Crimson Velvet', hex: '#b30000' },
                              { label: 'Marigold Gold', hex: '#ff9f1c' },
                            ].map((preset) => (
                              <button
                                key={preset.hex}
                                type="button"
                                onClick={() => handleChange('primaryColor', preset.hex)}
                                className="px-2 py-1 rounded text-[10px] border border-outline-variant/30 hover:border-primary transition-all flex items-center gap-1.5"
                                style={{ backgroundColor: `${preset.hex}15`, color: preset.hex }}
                              >
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.hex }} />
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <p className="text-[10px] text-on-surface-variant/60 mt-1">
                          Sets the primary accent color applied site-wide to buttons, highlights, badges, star ratings, and links.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="admin-card flex flex-col gap-5">
                    <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">animation</span>
                      Product Image Hover Auto-Slide
                    </h3>
                    <p className="text-[10px] text-on-surface-variant/60 -mt-2">
                      Applies wherever product images appear: gallery, homepage rows, and product detail.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="form-label" htmlFor="hover-slide-delay">Hover Delay Before Sliding (ms)</label>
                        <input
                          id="hover-slide-delay"
                          type="number"
                          min="0"
                          step="100"
                          value={form.productHoverSlideDelayMs ?? 1000}
                          onChange={(e) => handleChange('productHoverSlideDelayMs', Math.max(0, Number(e.target.value)))}
                          className="form-input text-[12px] py-2 px-3"
                        />
                        <p className="text-[10px] text-on-surface-variant/60 mt-1">
                          How long a shopper must hover before it starts auto-sliding through other images.
                        </p>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="hover-slide-interval">Time Between Slides (ms)</label>
                        <input
                          id="hover-slide-interval"
                          type="number"
                          min="700"
                          step="100"
                          value={form.productHoverSlideIntervalMs ?? 1800}
                          onChange={(e) => handleChange('productHoverSlideIntervalMs', Math.max(700, Number(e.target.value)))}
                          className="form-input text-[12px] py-2 px-3"
                        />
                        <p className="text-[10px] text-on-surface-variant/60 mt-1">
                          Minimum 700ms — the slide transition itself takes that long.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeSurface === 'videos' && (
                <div className="admin-card flex flex-col gap-5">
                  <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">movie</span>
                    Stories in Motion (Video Lookbooks)
                  </h3>

                  <div className="space-y-6">
                    {(form.lookbookVideos || []).map((video, idx) => (
                      <div key={video.id || idx} className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container-low/50 flex flex-col gap-3">
                        <h4 className="text-[12px] font-bold text-primary flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">play_circle</span>
                          Video Slot {idx + 1}
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="form-group">
                            <label className="form-label text-[11px]" htmlFor={`video-title-${idx}`}>Video Title</label>
                            <input
                              id={`video-title-${idx}`}
                              type="text"
                              value={video.title || ''}
                              onChange={(e) => {
                                const updated = [...(form.lookbookVideos || [])];
                                updated[idx] = { ...updated[idx], title: e.target.value };
                                handleChange('lookbookVideos', updated);
                              }}
                              placeholder="e.g. Vibrant Rani Pink Lookbook"
                              className="form-input text-[11px] py-1.5 px-3"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label text-[11px]" htmlFor={`video-desc-${idx}`}>Description</label>
                            <input
                              id={`video-desc-${idx}`}
                              type="text"
                              value={video.description || ''}
                              onChange={(e) => {
                                const updated = [...(form.lookbookVideos || [])];
                                updated[idx] = { ...updated[idx], description: e.target.value };
                                handleChange('lookbookVideos', updated);
                              }}
                              placeholder="e.g. Witness the detailed gold zari embroidery..."
                              className="form-input text-[11px] py-1.5 px-3"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-outline-variant/10">
                          <div className="form-group">
                            <label className="form-label text-[11px]">Video Source Mode</label>
                            <select
                              value={video.sourceMode || (video.src?.startsWith('blob:') || video.src?.startsWith('data:') ? 'upload' : 'url')}
                              onChange={(e) => {
                                const mode = e.target.value;
                                const updated = [...(form.lookbookVideos || [])];
                                updated[idx] = { ...updated[idx], sourceMode: mode, selectedProductId: '' };
                                handleChange('lookbookVideos', updated);
                              }}
                              className="form-select text-[11px] py-1.5 px-2"
                            >
                              <option value="url">Paste Custom Video URL</option>
                              <option value="preset">Select Mixkit Luxury Preset</option>
                              <option value="upload">Upload Custom MP4 Video File</option>
                              <option value="product">Select from Product Videos</option>
                            </select>
                          </div>

                          {(video.sourceMode === 'url' || (!video.sourceMode && !video.src?.startsWith('blob:'))) && (
                            <div className="form-group">
                              <label className="form-label text-[11px]" htmlFor={`video-url-${idx}`}>Video URL Link</label>
                              <input
                                id={`video-url-${idx}`}
                                type="text"
                                value={video.src || ''}
                                onChange={(e) => {
                                  const updated = [...(form.lookbookVideos || [])];
                                  updated[idx] = { ...updated[idx], src: e.target.value };
                                  handleChange('lookbookVideos', updated);
                                }}
                                placeholder="https://..."
                                className="form-input text-[11px] py-1.5 px-3"
                              />
                            </div>
                          )}

                          {video.sourceMode === 'preset' && (
                            <div className="form-group">
                              <label className="form-label text-[11px]" htmlFor={`video-preset-${idx}`}>Choose Preset Video</label>
                              <select
                                id={`video-preset-${idx}`}
                                value={video.src || ''}
                                onChange={(e) => {
                                  const updated = [...(form.lookbookVideos || [])];
                                  updated[idx] = { ...updated[idx], src: e.target.value };
                                  handleChange('lookbookVideos', updated);
                                }}
                                className="form-select text-[11px] py-1.5 px-2"
                              >
                                <option value="">-- Choose Preset --</option>
                                <option value="https://vjs.zencdn.net/v/oceans.mp4">Preset 1: Oceans Waves</option>
                                <option value="https://media.w3.org/2010/05/sintel/trailer_hd.mp4">Preset 2: Sintel Cinematic Trailer</option>
                                <option value="https://www.w3schools.com/html/mov_bbb.mp4">Preset 3: Big Buck Bunny</option>
                                <option value="https://www.w3schools.com/html/movie.mp4">Preset 4: Classic Canvas Film</option>
                              </select>
                            </div>
                          )}

                          {video.sourceMode === 'upload' && (
                            <div className="form-group">
                              <label className="form-label text-[11px]" htmlFor={`video-file-${idx}`}>Upload MP4 / WebM</label>
                              <input
                                id={`video-file-${idx}`}
                                type="file"
                                accept="video/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const localUrl = URL.createObjectURL(file);
                                    const updated = [...(form.lookbookVideos || [])];
                                    updated[idx] = { ...updated[idx], src: localUrl, originalName: file.name };
                                    handleChange('lookbookVideos', updated);
                                    showToast(`Video Slot ${idx + 1} loaded locally! Preview on the right.`);
                                  }
                                }}
                                className="form-input text-[11px] py-1 px-2 text-[10px]"
                              />
                              {video.originalName && (
                                <span className="text-[9px] text-on-surface-variant/70 mt-1 block truncate">
                                  Loaded: {video.originalName}
                                </span>
                              )}
                            </div>
                          )}

                          {video.sourceMode === 'product' && (
                            <div className="form-group">
                              <label className="form-label text-[11px]" htmlFor={`video-product-${idx}`}>Select Product</label>
                              <select
                                id={`video-product-${idx}`}
                                value={video.selectedProductId || ''}
                                onChange={(e) => {
                                  const prodId = e.target.value;
                                  const prod = products.find((p) => p.id === prodId);
                                  const firstVid = prod?.videos?.[0] || '';
                                  const updated = [...(form.lookbookVideos || [])];
                                  updated[idx] = {
                                    ...updated[idx],
                                    selectedProductId: prodId,
                                    src: firstVid,
                                  };
                                  handleChange('lookbookVideos', updated);
                                }}
                                className="form-select text-[11px] py-1.5 px-2"
                              >
                                <option value="">-- Choose Product --</option>
                                {products.map((p) => {
                                  const hasVideo = productHasVideoMap[p.id] || false;
                                  return (
                                    <option key={p.id} value={p.id}>
                                      {p.name || p.title} {hasVideo ? '🎥' : '❌'}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}

                          {video.sourceMode === 'product' && video.selectedProductId && (
                            <div className="col-span-2 pt-2 border-t border-outline-variant/10 mt-1">
                              <label className="form-label text-[10px] mb-1 font-semibold block text-primary">
                                Attach Product Video Clip (Select one to preview &amp; bind)
                              </label>
                              <div className="flex gap-3 overflow-x-auto py-1.5">
                                {(products.find((p) => p.id === video.selectedProductId)?.videos || []).map((vidSrc, vidIdx) => {
                                  const isActive = video.src === vidSrc;
                                  return (
                                    <div
                                      key={vidIdx}
                                      onClick={() => {
                                        const updated = [...(form.lookbookVideos || [])];
                                        updated[idx] = { ...updated[idx], src: vidSrc };
                                        handleChange('lookbookVideos', updated);
                                        showToast(`Attached Clip ${vidIdx + 1} from product video library!`);
                                      }}
                                      className={`flex-shrink-0 relative w-16 aspect-[9/16] rounded border cursor-pointer overflow-hidden transition-all shadow-sm ${
                                        isActive ? 'border-primary ring-2 ring-primary/20 scale-95' : 'border-outline-variant/40 opacity-75 hover:opacity-100'
                                      }`}
                                    >
                                      <video src={vidSrc} className="w-full h-full object-cover" muted playsInline />
                                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                                        {isActive ? (
                                          <span className="material-symbols-outlined text-white text-[16px] fill-icon">check_circle</span>
                                        ) : (
                                          <span className="material-symbols-outlined text-white text-[16px] opacity-0 hover:opacity-100">play_circle</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Live preview for the active surface — always shows what the settings on the left will produce */}
            <section className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
              <div>
                <h2 className="admin-card-title">Live Preview</h2>
                <p className="admin-card-subtitle">
                  {SURFACES.find((s) => s.key === activeSurface)?.label}
                </p>
              </div>

              <div
                className={`p-6 rounded-2xl border border-outline-variant transition-all duration-300 relative min-h-[420px] flex items-center justify-center overflow-hidden shadow-inner ${isDarkish ? 'dark' : ''}`}
                style={{
                  backgroundColor: form.themeMode === 'dark' ? '#121212' : form.themeMode === 'midnight' ? '#030712' : form.storeBgColor,
                  background: form.themeMode === 'light' ? form.backdropBg : 'none',
                  backdropFilter: form.backdropFilter,
                  color: isDarkish ? '#f5f5f5' : '#1c1b1b',
                }}
              >
                {form.backdropFilter !== 'none' && (
                  <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-20">
                    <span className="text-[10px] font-mono tracking-widest text-outline uppercase">
                      Backdrop Filter Active ({form.backdropFilter})
                    </span>
                  </div>
                )}

                <div className="w-full relative z-10 max-w-[500px]">
                  {activeSurface === 'hero' && !heroLoading && (
                    <div className="flex flex-col gap-4 w-full">
                      <div className="flex justify-center gap-2">
                        {heroSlides.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setHeroPreviewIdx(i)}
                            className={`w-8 h-8 rounded-full text-[11px] font-bold flex items-center justify-center transition-colors ${
                              heroPreviewIdx === i ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:text-primary'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>

                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-outline-variant/40 shadow-inner bg-surface-container-high">
                        {heroSlides[heroPreviewIdx]?.image ? (
                          <div
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{ backgroundImage: `url('${heroSlides[heroPreviewIdx].image}')` }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant/40">
                            <span className="material-symbols-outlined text-[32px]">image</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/25" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
                          {!heroSlides[heroPreviewIdx]?.hideTitle && (
                            <h1
                              className="text-white font-bold mb-3 max-w-[80%] drop-shadow-lg leading-snug playfair"
                              style={{ fontSize: 'calc(0.8vw + 12px)' }}
                            >
                              {heroSlides[heroPreviewIdx]?.title || 'Your Slide Headline'}
                            </h1>
                          )}
                          {!heroSlides[heroPreviewIdx]?.hideCta && (
                            <span className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-caps text-[10px] uppercase tracking-widest shadow-md">
                              {heroSlides[heroPreviewIdx]?.cta || 'Shop Now'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSurface === 'topnav' && (
                    <div className="flex flex-col gap-3 w-full max-w-[420px] mx-auto">
                      <span className="text-[9px] uppercase tracking-wider opacity-70 text-center block">Header Navigation Preview</span>
                      <div
                        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 p-4 rounded-xl border border-outline-variant/30"
                        style={{ backgroundColor: surfaceCardBg }}
                      >
                        {topNavLinks.length === 0 ? (
                          <span className="text-[11px] text-on-surface-variant/60">No links added yet</span>
                        ) : (
                          topNavLinks.map((link) => (
                            <span
                              key={link.id}
                              className="font-label-caps text-[10px] uppercase tracking-wider"
                              style={{ color: form.primaryColor || '#ac2471' }}
                            >
                              {link.label}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {activeSurface === 'listing' && (
                    <div
                      className="grid gap-3 w-full"
                      style={{ gridTemplateColumns: `repeat(${form.gridCols || 4}, minmax(0, 1fr))` }}
                    >
                      {Array.from({ length: form.gridCols || 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex flex-col transition-all duration-300 shadow-md animate-fade-in"
                          style={{
                            borderRadius: form.borderRadius,
                            borderWidth: form.borderWidth,
                            borderColor: form.borderColor,
                            borderStyle: 'solid',
                            backgroundColor: surfaceCardBg,
                            overflow: 'hidden',
                            width: form.listingImgSize || '100%',
                            marginInline: 'auto',
                          }}
                        >
                          <div
                            className="preview-aspect-box w-full"
                            style={{ aspectRatio: form.listingImgAspect, borderRadius: '0px', borderWidth: '0px', minHeight: '40px' }}
                          >
                            <span className="material-symbols-outlined text-outline-variant text-[14px]">image</span>
                          </div>
                          {form.gridCols <= 4 ? (
                            <div className="p-2 flex flex-col gap-0.5" style={{ backgroundColor: surfaceCardBg }}>
                              <span className="text-[7px] uppercase tracking-wider font-bold leading-none" style={{ color: form.primaryColor || '#ac2471' }}>
                                Category
                              </span>
                              <h4 className="font-bold text-on-surface line-clamp-1 leading-none" style={{ fontSize: `calc(${form.titleSizeListing} * 0.75)` }}>
                                Sample Item
                              </h4>
                              <div className="font-bold text-on-surface mt-0.5" style={{ fontSize: `calc(${form.priceSizeListing} * 0.75)` }}>
                                ₹1,499
                              </div>
                            </div>
                          ) : (
                            <div className="p-1 flex flex-col bg-surface-container-lowest text-center">
                              <span className="font-bold text-on-surface text-[8px] leading-none">Item {i + 1}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeSurface === 'detail' && (
                    <div className="flex flex-col gap-4 max-w-[260px] mx-auto">
                      <div
                        className="preview-aspect-box shadow-sm"
                        style={{
                          aspectRatio: form.detailImgAspect,
                          borderRadius: form.borderRadius,
                          borderWidth: form.borderWidth,
                          borderColor: form.borderColor,
                          borderStyle: 'solid',
                        }}
                      >
                        <span className="material-symbols-outlined text-outline-variant text-3xl">image</span>
                      </div>

                      <div className="flex gap-2 justify-center">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="border flex items-center justify-center bg-surface-container"
                            style={{
                              width: form.galleryThumbW,
                              height: form.galleryThumbH,
                              borderRadius: form.borderRadiusSm,
                              borderColor: i === 0 ? (form.primaryColor || '#ac2471') : 'var(--color-outline-variant)',
                              boxShadow: i === 0 ? `0 0 0 2px ${(form.primaryColor || '#ac2471')}30` : 'none',
                            }}
                          >
                            <span className="material-symbols-outlined text-outline-variant text-[16px]">image</span>
                          </div>
                        ))}
                      </div>

                      <div
                        className="space-y-2 border-t border-outline-variant/30 pt-3 backdrop-blur-md p-3 rounded-xl border"
                        style={{
                          backgroundColor: form.themeMode === 'dark' ? '#1e1e1e' : form.themeMode === 'midnight' ? '#0b0f19' : 'rgba(255, 255, 255, 0.7)',
                          borderColor: isDarkish ? '#3a3a3a' : 'var(--color-outline-variant)',
                          color: isDarkish ? '#f5f5f5' : '#1c1b1b',
                        }}
                      >
                        <h2 className="font-bold leading-tight" style={{ fontSize: form.titleSizeDetail }}>
                          Detail Title Text
                        </h2>
                        <p className="leading-relaxed text-[13px] opacity-90" style={{ fontSize: form.descSizeDetail }}>
                          This text block displays how long product description paragraphs adjust in size to ensure optimal legibility and screen aesthetics.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeSurface === 'global' && (
                    <div className="flex flex-col gap-4 w-full max-w-[320px] mx-auto">
                      <div className="flex gap-3">
                        <div className="flex-1 flex flex-col items-center gap-1.5">
                          <div
                            className="w-full h-12 rounded-lg border border-outline-variant/40"
                            style={{ backgroundColor: form.themeMode === 'dark' ? '#121212' : form.themeMode === 'midnight' ? '#030712' : form.storeBgColor }}
                          />
                          <span className="text-[9px] uppercase tracking-wider opacity-70">Background</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1.5">
                          <div className="w-full h-12 rounded-lg border border-outline-variant/40" style={{ backgroundColor: form.primaryColor || '#ac2471' }} />
                          <span className="text-[9px] uppercase tracking-wider opacity-70">Primary Accent</span>
                        </div>
                      </div>

                      <div
                        className="p-4 rounded-xl border shadow-sm flex flex-col gap-2"
                        style={{
                          backgroundColor: surfaceCardBg,
                          borderRadius: form.borderRadius,
                          borderWidth: form.borderWidth,
                          borderColor: form.borderColor,
                          borderStyle: 'solid',
                        }}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: form.primaryColor || '#ac2471' }}>
                          Sample Button / Badge
                        </span>
                        <button
                          type="button"
                          className="text-[11px] font-bold py-1.5 px-3 rounded-md self-start"
                          style={{ backgroundColor: form.primaryColor || '#ac2471', color: '#fff' }}
                        >
                          Add to Cart
                        </button>
                      </div>

                      <div className="text-[10px] text-center opacity-70 font-mono">
                        Hover {form.productHoverSlideDelayMs ?? 1000}ms → advance every {form.productHoverSlideIntervalMs ?? 1800}ms
                      </div>
                    </div>
                  )}

                  {activeSurface === 'videos' && (
                    <div className="flex gap-3 overflow-x-auto py-1 max-w-[480px] mx-auto">
                      {(form.lookbookVideos || []).map((video, idx) => (
                        <div
                          key={video.id || idx}
                          className="flex-shrink-0 w-28 aspect-[9/16] rounded-lg bg-surface-container-high border border-outline-variant/35 overflow-hidden relative shadow-sm"
                        >
                          {video.src ? (
                            <video src={video.src} className="w-full h-full object-cover" muted loop playsInline autoPlay />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-[18px]">movie</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-end p-1.5">
                            <span className="text-[7px] text-white line-clamp-2 font-bold">{video.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

          </div>

          {/* Form actions — apply to the whole theme, only shown for theme-driven surfaces */}
          {themeSurfaces.includes(activeSurface) && (
            <div className="flex gap-3 justify-start">
              <button type="button" onClick={handleReset} disabled={isSaving} className="btn btn-secondary py-2.5 px-5 text-[11px]">
                Reset Defaults
              </button>
              <button type="submit" disabled={isSaving} className="btn btn-primary py-2.5 px-5 text-[11px]">
                {isSaving ? 'Saving Configurations…' : 'Save Layout Configurations'}
              </button>
            </div>
          )}
        </form>

        {/* Developer Diagnostics — collapsed by default, out of the way of normal configuration work */}
        <section className="admin-card flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setDiagOpen((v) => !v)}
            className="flex items-center justify-between gap-4 w-full text-left"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">flaky</span>
              <span className="font-title-sm text-[13px] text-on-surface-variant font-semibold">Developer Diagnostics</span>
              {diagStatus && (
                <span className={`status-badge px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] ${
                  diagStatus === 'passed' ? 'test-badge-passed' : diagStatus === 'failed' ? 'test-badge-failed' : 'test-badge-running'
                }`}>
                  {diagStatus.toUpperCase()}
                </span>
              )}
            </div>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              {diagOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {diagOpen && (
            <div className="flex flex-col gap-4 pt-2 border-t border-outline-variant/20">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="admin-card-subtitle">
                  Automated test assertions confirming theme database writes, state bindings, and DOM CSS variable injections.
                </p>
                <button onClick={runDiagnostics} disabled={isSaving} className="btn btn-secondary text-[11px] py-2 px-4 shrink-0">
                  Run Layout Assertions
                </button>
              </div>

              {diagResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {diagResults.map((res, i) => (
                    <div key={i} className="test-card-box flex items-start gap-3">
                      <span className={`material-symbols-outlined shrink-0 text-[18px] ${res.status === 'pass' ? 'text-secondary' : 'text-error'}`}>
                        {res.status === 'pass' ? 'check_circle' : 'cancel'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-on-surface text-[12px]">{res.name}</p>
                        <p className="text-[10px] text-on-surface-variant/80 mt-0.5">{res.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
