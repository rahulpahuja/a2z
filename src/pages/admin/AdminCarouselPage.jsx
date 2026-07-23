import { useEffect, useRef, useState } from 'react';
import { subscribeToCarousel, saveCarousel, DEFAULT_CAROUSEL_SLIDES } from '../../services/carousel.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useProducts } from '../../context/ProductsContext.jsx';
import { compressImageFile } from '../../utils/imageCompression.js';
import { isHeicFile, convertHeicFileToPng } from '../../utils/heic.js';

// A slide's actual destination is always stored in `link` (a path string) so
// HomePage's <Link to={slide.link}> never has to know about link types. The
// admin form below just offers a friendlier, structured way to build that
// path instead of hand-typing it, and infers the type back out of an old
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

// R2 Image Uploader Function
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

export default function AdminCarouselPage() {
  const { showToast } = useToast();
  const { products, categories } = useProducts();
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingSlideIdx, setUploadingSlideIdx] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null); // { idx, url } — local blob preview while an upload is in flight
  const [previewingSlide, setPreviewingSlide] = useState(null); // For slide visual testing
  const uploadControllerRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeToCarousel((loadedSlides) => {
      // Ensure there are always exactly 4 slides in the state
      const slidesCopy = [...loadedSlides];
      while (slidesCopy.length < 4) {
        // Fall back to default slides if they are missing
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
      setSlides(slidesCopy.slice(0, 4).map(withLinkFields));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleFieldChange = (index, field, value) => {
    setSlides((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Recomputes the stored `link` path whenever the destination type or one
  // of its supporting fields (category/product/custom url) changes.
  const handleLinkFieldChange = (index, field, value) => {
    setSlides((prev) => {
      const copy = [...prev];
      const nextSlide = { ...copy[index], [field]: value };
      nextSlide.link = buildLink(nextSlide);
      copy[index] = nextSlide;
      return copy;
    });
  };

  const handleImageUpload = async (index, event) => {
    let file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const controller = new AbortController();
    uploadControllerRef.current = controller;
    setUploadingSlideIdx(index);

    let localPreviewUrl = null;
    try {
      // HEIC conversion if needed
      if (isHeicFile(file)) {
        showToast('Converting HEIC image…');
        file = await convertHeicFileToPng(file);
      }

      // Compression
      showToast('Compressing image…');
      const compressed = await compressImageFile(file);
      localPreviewUrl = compressed.previewUrl;
      setUploadPreview({ idx: index, url: localPreviewUrl });

      // Upload to R2
      showToast('Uploading to R2...');
      const customName = `carousel_slide_${index + 1}_${Date.now()}${compressed.extension}`;
      const uploadedUrl = await uploadImageToExternalServer(compressed.file, customName, controller.signal);

      handleFieldChange(index, 'image', uploadedUrl);
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

  const handleCancelUpload = () => {
    uploadControllerRef.current?.abort();
  };

  const handleSave = async () => {
    // Validate that all slides have images and links
    for (let i = 0; i < 4; i++) {
      if (!slides[i].image.trim()) {
        showToast(`Please upload an image for Slide ${i + 1}.`);
        return;
      }
      if (!slides[i].title.trim()) {
        showToast(`Please fill in the title for Slide ${i + 1}.`);
        return;
      }
    }

    setSaving(true);
    try {
      await saveCarousel(slides);
      showToast('Hero Carousel configuration saved successfully!');
    } catch (err) {
      showToast(err.message || 'Could not save carousel settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all slides to default demo configurations?')) {
      setSlides(DEFAULT_CAROUSEL_SLIDES.map(withLinkFields));
      showToast('Reset to defaults. Remember to click Save to apply changes.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="animate-spin inline-block w-8 h-8 border-4 border-t-transparent border-primary rounded-full"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6">
        <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Manage Hero Carousel</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Configure and update the 4 homepage hero slider images, titles, call-to-actions, and destination links.
        </p>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 flex flex-col gap-8">
        
        {/* Recommended Upload Specs Information Box */}
        <section className="bg-primary-container/20 border border-primary/20 rounded-xl p-5 flex items-start gap-4 shadow-sm">
          <span className="material-symbols-outlined text-[32px] text-primary shrink-0 mt-0.5">info</span>
          <div>
            <h4 className="font-title-sm text-[14px] text-on-primary-container font-semibold">Image Upload Guidelines &amp; Resolutions</h4>
            <p className="font-body-sm text-[12px] text-on-surface-variant mt-1.5 leading-relaxed">
              For high-end visual fidelity on retina displays and desktops, we recommend uploading images with a resolution of <strong>1920x1080 pixels (16:9 Aspect Ratio)</strong> or <strong>1920x800 pixels (widescreen)</strong>. 
            </p>
            <p className="font-body-sm text-[11px] text-on-surface-variant/80 mt-1 leading-relaxed">
              * Note: The hero carousel scales cover-style (`background-size: cover`) to stay responsive. Keep key visual subjects (models, faces, jewelry) in the <strong>center</strong> of your image so they do not clip on mobile screens.
            </p>
          </div>
        </section>

        {/* Main Grid for 4 Slides */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {slides.map((slide, idx) => {
            const isUploading = uploadingSlideIdx === idx;
            return (
              <div 
                key={slide.id || idx} 
                className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/30 flex flex-col gap-4 shadow-sm hover:shadow transition-shadow"
              >
                {/* Header Indicator */}
                <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                  <h3 className="font-title-sm text-[14px] text-primary font-bold uppercase tracking-wider">
                    Carousel Slide #{idx + 1}
                  </h3>
                  <div className="flex items-center gap-3 ml-auto">
                    <button
                      type="button"
                      onClick={() => setPreviewingSlide(slide)}
                      className="text-primary hover:underline font-label-caps text-[10px] uppercase flex items-center gap-1.5 px-2 py-1 rounded bg-primary/5 border border-primary/25"
                    >
                      <span className="material-symbols-outlined text-[14px]">visibility</span>
                      Preview
                    </button>
                    <span className="text-[10px] text-on-surface-variant/70 font-mono">ID: {slide.id}</span>
                  </div>
                </div>

                {/* Live Image Preview and Uploader */}
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="w-full sm:w-36 aspect-video sm:h-24 rounded-lg bg-surface-container overflow-hidden border border-outline-variant/40 relative shrink-0">
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
                        <span className="material-symbols-outlined text-[28px]">image</span>
                        <span className="text-[10px] mt-1">No Image</span>
                      </div>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="animate-spin inline-block w-6 h-6 border-2 border-t-transparent border-white rounded-full"></span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full flex flex-col gap-2">
                    <label className="font-label-caps text-[10px] text-on-surface-variant">Slide Image</label>
                    {isUploading ? (
                      <button
                        type="button"
                        onClick={handleCancelUpload}
                        className="border border-error text-error font-label-caps text-[10px] px-3.5 py-2.5 rounded hover:bg-error/10 uppercase transition-colors"
                      >
                        Cancel Upload
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => document.getElementById(`upload-slide-${idx}`).click()}
                        disabled={uploadingSlideIdx !== null}
                        className="bg-primary-container text-on-primary-container font-label-caps text-[10px] px-3.5 py-2.5 rounded hover:opacity-90 uppercase transition-opacity border border-outline-variant/20 disabled:opacity-50"
                      >
                        {slide.image ? 'Replace Image' : 'Upload Image'}
                      </button>
                    )}
                    <input
                      id={`upload-slide-${idx}`}
                      type="file"
                      accept="image/*,.heic,.heif"
                      onChange={(e) => handleImageUpload(idx, e)}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant" htmlFor={`title-${idx}`}>
                    Headline / Title
                  </label>
                  <input
                    id={`title-${idx}`}
                    type="text"
                    value={slide.title}
                    onChange={(e) => handleFieldChange(idx, 'title', e.target.value)}
                    placeholder="e.g. The Festive Collection"
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2.5 font-body-sm text-body-sm text-on-surface transition-colors"
                  />
                </div>

                {/* Alt Text */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant" htmlFor={`alt-${idx}`}>
                    Image Alt Description (Accessibility)
                  </label>
                  <input
                    id={`alt-${idx}`}
                    type="text"
                    value={slide.alt}
                    onChange={(e) => handleFieldChange(idx, 'alt', e.target.value)}
                    placeholder="Describe what is shown in the image..."
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2.5 font-body-sm text-body-sm text-on-surface-variant/90 transition-colors"
                  />
                </div>

                {/* Visibility toggles */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
                  <label className="flex items-center gap-2 text-[11px] text-on-surface-variant cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!slide.hideTitle}
                      onChange={(e) => handleFieldChange(idx, 'hideTitle', e.target.checked)}
                      className="accent-primary"
                    />
                    Hide headline text
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-on-surface-variant cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!slide.hideCta}
                      onChange={(e) => handleFieldChange(idx, 'hideCta', e.target.checked)}
                      className="accent-primary"
                    />
                    Hide CTA button
                  </label>
                </div>

                {/* CTA label (only meaningful while the button is shown) */}
                {!slide.hideCta && (
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-caps text-[10px] text-on-surface-variant" htmlFor={`cta-${idx}`}>
                      Button CTA Label
                    </label>
                    <input
                      id={`cta-${idx}`}
                      type="text"
                      value={slide.cta}
                      onChange={(e) => handleFieldChange(idx, 'cta', e.target.value)}
                      placeholder="e.g. Shop Now"
                      className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2.5 font-body-sm text-body-sm text-on-surface transition-colors"
                    />
                  </div>
                )}

                {/* Destination picker — always applies, since the whole slide is still clickable even with the button hidden */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-caps text-[10px] text-on-surface-variant" htmlFor={`link-type-${idx}`}>
                      Where should this slide land?
                    </label>
                    <select
                      id={`link-type-${idx}`}
                      value={slide.linkType || 'products'}
                      onChange={(e) => handleLinkFieldChange(idx, 'linkType', e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2.5 font-body-sm text-body-sm text-on-surface transition-colors"
                    >
                      <option value="home">Home Page</option>
                      <option value="products">All Products</option>
                      <option value="category">A Specific Category</option>
                      <option value="product">A Specific Product</option>
                      <option value="custom">Custom URL</option>
                    </select>
                  </div>

                  {slide.linkType === 'category' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-caps text-[10px] text-on-surface-variant" htmlFor={`link-category-${idx}`}>
                        Category
                      </label>
                      <select
                        id={`link-category-${idx}`}
                        value={slide.linkCategory || ''}
                        onChange={(e) => handleLinkFieldChange(idx, 'linkCategory', e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2.5 font-body-sm text-body-sm text-on-surface transition-colors"
                      >
                        <option value="">-- Choose Category --</option>
                        {categories.filter((c) => c !== 'All').map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {slide.linkType === 'product' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-caps text-[10px] text-on-surface-variant" htmlFor={`link-product-${idx}`}>
                        Product
                      </label>
                      <select
                        id={`link-product-${idx}`}
                        value={slide.linkProductId || ''}
                        onChange={(e) => handleLinkFieldChange(idx, 'linkProductId', e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2.5 font-body-sm text-body-sm text-on-surface transition-colors"
                      >
                        <option value="">-- Choose Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name || p.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {slide.linkType === 'custom' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-caps text-[10px] text-on-surface-variant" htmlFor={`link-custom-${idx}`}>
                        Custom Path
                      </label>
                      <input
                        id={`link-custom-${idx}`}
                        type="text"
                        value={slide.linkCustom || ''}
                        onChange={(e) => handleLinkFieldChange(idx, 'linkCustom', e.target.value)}
                        placeholder="e.g. /about-us"
                        className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-3 py-2.5 font-body-sm text-body-sm text-on-surface transition-colors"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Action Button Row */}
        <section className="flex gap-4 border-t border-outline-variant/30 pt-6">
          <button
            onClick={handleSave}
            disabled={saving || uploadingSlideIdx !== null}
            className="bg-primary text-on-primary font-label-caps text-label-caps px-8 py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-t-transparent border-on-primary rounded-full"></span>
                Saving…
              </>
            ) : (
              'Save Carousel'
            )}
          </button>
          
          <button
            onClick={handleReset}
            disabled={saving || uploadingSlideIdx !== null}
            className="border border-outline text-on-surface font-label-caps text-label-caps px-6 py-3 rounded-lg uppercase tracking-widest hover:bg-surface-container transition-colors disabled:opacity-50"
          >
            Reset to Defaults
          </button>
        </section>

      </main>

      {/* Slide Live Mock Preview Modal */}
      {previewingSlide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-4xl overflow-hidden flex flex-col shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container">
              <div>
                <span className="font-label-caps text-[10px] text-primary uppercase font-bold tracking-widest">Mock Live Render</span>
                <h3 className="font-title-sm text-[16px] text-on-surface font-bold mt-0.5">Hero Slider Mock Preview</h3>
              </div>
              <button
                onClick={() => setPreviewingSlide(null)}
                className="w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body - exact recreation of homepage hero banner context */}
            <div className="p-6 bg-surface-container-low flex justify-center items-center">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-outline-variant/40 shadow-inner bg-black flex flex-col justify-end">
                {/* Back Image */}
                {previewingSlide.image ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-300"
                    style={{ backgroundImage: `url('${previewingSlide.image}')` }}
                    data-alt={previewingSlide.alt}
                  />
                ) : (
                  <div className="absolute inset-0 bg-surface-container flex flex-col items-center justify-center text-on-surface-variant/40">
                    <span className="material-symbols-outlined text-[48px]">image</span>
                    <span className="font-body-sm text-[12px] mt-2">No image path specified</span>
                  </div>
                )}
                {/* Visual overlay */}
                <div className="absolute inset-0 bg-black/25"></div>

                {/* Centered slide texts */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-10 select-none">
                  {!previewingSlide.hideTitle && (
                    <h1 className="font-display-lg text-white mb-6 max-w-xl drop-shadow-lg font-bold leading-snug playfair" style={{ fontSize: 'calc(1.5vw + 16px)' }}>
                      {previewingSlide.title || 'Your Slide Headline Goes Here'}
                    </h1>
                  )}
                  {!previewingSlide.hideCta && (
                    <button
                      type="button"
                      className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-label-caps text-[10px] uppercase tracking-widest hover:opacity-90 shadow-md cursor-default pointer-events-none"
                    >
                      {previewingSlide.cta || 'Shop Now'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-outline-variant/30 flex justify-between items-center bg-surface-container">
              <p className="font-body-sm text-[11px] text-on-surface-variant max-w-md">
                This is a scale rendering simulating desktop layouts. Text sizing and scaling automatically adjust based on window width.
              </p>
              <button
                type="button"
                onClick={() => setPreviewingSlide(null)}
                className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-label-caps text-[10px] uppercase hover:opacity-90 transition-opacity"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
