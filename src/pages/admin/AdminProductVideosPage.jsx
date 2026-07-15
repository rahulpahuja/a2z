import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { subscribeToAdminProducts, updateProductVideos, createFileMetadata } from '../../services/adminProducts.js';
import { useToast } from '../../context/ToastContext.jsx';
import { transcodeVideoToH264 } from '../../utils/videoTranscode.js';

const MAX_VIDEOS = 2;
const SLOTS = [0, 1];

const uploadVideoToExternalServer = async (file, customName) => {
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

const VIDEO_EXTENSION_RE = /\.(mp4|mov|m4v|webm|ogg|avi|mkv)$/i;

// iPhone videos come through as .mov (often HEVC-encoded) with MIME type
// "video/quicktime" — that already matches "video/*", but some file pickers
// hand back an empty file.type, so fall back to checking the extension too.
const isVideoFile = (file) => file.type.startsWith('video/') || VIDEO_EXTENSION_RE.test(file.name);

const getR2KeyFromUrl = (url) => {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/');
    return parts[parts.length - 1];
  } catch {
    return null;
  }
};

export default function AdminProductVideosPage() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedProductId = searchParams.get('productId');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(null);

  const [videoFiles, setVideoFiles] = useState([null, null]);
  const [videoPreviews, setVideoPreviews] = useState(['', '']);
  const [videoNames, setVideoNames] = useState(['', '']);
  const [removedKeys, setRemovedKeys] = useState([]);
  const [saving, setSaving] = useState(false);
  const [convertingProgress, setConvertingProgress] = useState({});

  useEffect(() => {
    const unsubscribe = subscribeToAdminProducts((rows, error) => {
      setProducts(rows);
      setLoadError(error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!requestedProductId || selectedProductId) return;
    const product = products.find((p) => p.id === requestedProductId);
    if (product) {
      loadProductIntoForm(product);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedProductId, products, selectedProductId]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return products.filter((p) => {
      const title = (p.title || p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      return title.includes(term) || sku.includes(term);
    });
  }, [products, query]);

  const loadProductIntoForm = (product) => {
    setSelectedProductId(product.id);
    setSearchParams({ productId: product.id });
    setQuery('');
    const existing = product.videos ?? [];
    const previews = ['', ''];
    const names = ['', ''];
    existing.slice(0, MAX_VIDEOS).forEach((url, idx) => {
      previews[idx] = url;
      names[idx] = getR2KeyFromUrl(url) || '';
    });
    setVideoPreviews(previews);
    setVideoNames(names);
    setVideoFiles([null, null]);
    setRemovedKeys([]);
  };

  const handleVideoChange = async (index, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isVideoFile(file)) {
      showToast('Please select a valid video file.');
      return;
    }

    setConvertingProgress((prev) => ({ ...prev, [index]: 0 }));
    let converted;
    try {
      converted = await transcodeVideoToH264(file, (progress) => {
        setConvertingProgress((prev) => ({ ...prev, [index]: progress }));
      });
    } catch (err) {
      showToast(err.message || 'Could not convert this video for playback compatibility.');
      setConvertingProgress((prev) => {
        const copy = { ...prev };
        delete copy[index];
        return copy;
      });
      return;
    }
    setConvertingProgress((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });

    const autoName = `${selectedProduct.id}_video_${index + 1}.mp4`;

    setVideoFiles((prev) => {
      const copy = [...prev];
      copy[index] = converted;
      return copy;
    });
    setVideoPreviews((prev) => {
      const copy = [...prev];
      if (copy[index] && copy[index].startsWith('blob:')) URL.revokeObjectURL(copy[index]);
      copy[index] = URL.createObjectURL(converted);
      return copy;
    });
    setVideoNames((prev) => {
      const copy = [...prev];
      copy[index] = autoName;
      return copy;
    });
  };

  const clearVideoSlot = (index) => {
    const currentPreview = videoPreviews[index];
    if (currentPreview && !currentPreview.startsWith('blob:')) {
      const key = getR2KeyFromUrl(currentPreview);
      if (key) setRemovedKeys((prev) => [...prev, key]);
    }
    setVideoFiles((prev) => {
      const copy = [...prev];
      copy[index] = null;
      return copy;
    });
    setVideoPreviews((prev) => {
      const copy = [...prev];
      if (copy[index] && copy[index].startsWith('blob:')) URL.revokeObjectURL(copy[index]);
      copy[index] = '';
      return copy;
    });
    setVideoNames((prev) => {
      const copy = [...prev];
      copy[index] = '';
      return copy;
    });
  };

  const backToSearch = () => {
    setSelectedProductId(null);
    setSearchParams({});
    videoPreviews.forEach((preview) => {
      if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    });
    setVideoFiles([null, null]);
    setVideoPreviews(['', '']);
    setVideoNames(['', '']);
    setRemovedKeys([]);
  };

  const handleSave = async () => {
    const activeSlots = SLOTS.filter((idx) => videoFiles[idx] || videoPreviews[idx]);
    if (activeSlots.length === 0) {
      showToast('Add at least 1 video before saving.');
      return;
    }

    setSaving(true);
    try {
      const apiUrl = import.meta.env.VITE_IMAGE_UPLOAD_API_URL;

      const deletePromises = removedKeys.map(async (key) => {
        if (!apiUrl) return;
        try {
          await fetch(`${apiUrl}/${key}`, { method: 'DELETE' });
        } catch (e) {
          console.error(`Failed to delete R2 video: ${key}`, e);
        }
      });
      await Promise.all(deletePromises);

      const uploadedUrls = [];
      const newUploads = [];
      for (const idx of activeSlots) {
        const file = videoFiles[idx];
        const customName = videoNames[idx].trim();
        if (file) {
          const url = await uploadVideoToExternalServer(file, customName);
          uploadedUrls.push(url);
          newUploads.push({ key: customName, url, name: file.name, size: file.size, type: file.type });
        } else {
          uploadedUrls.push(videoPreviews[idx]);
        }
      }

      await updateProductVideos(selectedProduct.id, uploadedUrls);

      const metaPromises = newUploads.map((upload) =>
        createFileMetadata({
          productId: selectedProduct.id,
          key: upload.key,
          url: upload.url,
          originalName: upload.name,
          fileSize: upload.size,
          contentType: upload.type,
        })
      );
      await Promise.all(metaPromises);

      showToast('Product videos saved.');
      setRemovedKeys([]);
    } catch (err) {
      showToast(err.message || 'Could not save videos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6">
        <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Product Videos</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Search for a product that already exists, then upload 1–2 videos for it.
        </p>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 flex flex-col gap-8">
        {!selectedProduct ? (
          <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
            <h2 className="font-title-sm text-title-sm text-on-surface mb-4">Find a Product</h2>
            {requestedProductId && !loading && !loadError && (
              <p className="font-body-sm text-body-sm text-error mb-4">
                Couldn't find a product with ID "{requestedProductId}". Search for it below instead.
              </p>
            )}
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by product title or SKU…"
                className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
              />
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            </div>

            {loading ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-4">Loading products…</p>
            ) : loadError ? (
              <p className="font-body-sm text-body-sm text-error mt-4">
                Couldn't load products ({loadError.message || 'permission denied'}).
              </p>
            ) : query.trim() && matches.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-4">
                No products match "{query}". Add the product first under Products before uploading its video.
              </p>
            ) : matches.length > 0 ? (
              <ul className="mt-4 divide-y divide-outline-variant/20 border border-outline-variant/20 rounded-lg overflow-hidden">
                {matches.map((product) => {
                  const videoCount = product.videos?.length ?? 0;
                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => loadProductIntoForm(product)}
                        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-surface-container-high transition-colors text-left"
                      >
                        {product.image && (
                          <div className="w-12 h-14 rounded-md overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/30">
                            <img src={product.image} className="w-full h-full object-cover" alt={product.title} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-body-lg text-body-lg text-on-surface truncate">{product.title || product.name}</p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            SKU {product.sku} · {product.categoryTitle}
                          </p>
                          <p className="font-body-sm text-[11px] text-on-surface-variant/70 font-mono truncate">
                            ID: {product.id}
                          </p>
                        </div>
                        <span className="font-label-caps text-label-caps text-on-surface-variant whitespace-nowrap">
                          {videoCount}/{MAX_VIDEOS} videos
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-4">
                Start typing to search for a product that's already been added.
              </p>
            )}
          </section>
        ) : (
          <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                {selectedProduct.image && (
                  <div className="w-14 h-16 rounded-md overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/30">
                    <img src={selectedProduct.image} className="w-full h-full object-cover" alt={selectedProduct.title} />
                  </div>
                )}
                <div>
                  <h2 className="font-title-sm text-title-sm text-on-surface">{selectedProduct.title || selectedProduct.name}</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    SKU {selectedProduct.sku} · {selectedProduct.categoryTitle}
                  </p>
                  <p className="font-body-sm text-[11px] text-on-surface-variant/70 font-mono">
                    ID: {selectedProduct.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={backToSearch}
                className="font-label-caps text-label-caps text-primary hover:underline"
              >
                Choose a different product
              </button>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant/80 mb-5">
              iPhone videos (.MOV, including HEVC) are supported. Every video is automatically converted to a
              universally-compatible format in your browser before it uploads, so it plays correctly for every
              customer regardless of their device or browser.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {SLOTS.map((index) => {
                const preview = videoPreviews[index];
                const fileName = videoNames[index];
                const hasVideo = !!preview;
                const converting = convertingProgress[index] !== undefined;
                const progressPct = Math.round((convertingProgress[index] ?? 0) * 100);

                return (
                  <div key={index} className="flex flex-col gap-2 p-3 border border-outline-variant/40 rounded-lg bg-surface-container-lowest">
                    <div className="flex justify-between items-center">
                      <span className="font-label-caps text-[10px] text-on-surface-variant">
                        Video {index + 1} {index === 0 && <span className="text-error font-bold">*</span>}
                      </span>
                      {hasVideo && !converting && (
                        <button
                          type="button"
                          onClick={() => clearVideoSlot(index)}
                          className="text-error font-body-sm text-[10px] hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {converting ? (
                      <div className="w-full aspect-video rounded-md border-2 border-dashed border-primary/40 bg-surface-container-low flex flex-col items-center justify-center gap-2 px-4">
                        <span className="animate-spin inline-block w-6 h-6 border-2 border-t-transparent border-primary rounded-full"></span>
                        <span className="font-body-sm text-[11px] text-on-surface-variant">
                          Converting for compatibility… {progressPct}%
                        </span>
                      </div>
                    ) : preview ? (
                      <div className="w-full aspect-video rounded-md overflow-hidden bg-black border border-outline-variant/30">
                        <video src={preview} controls className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div
                        onClick={() => document.getElementById(`video-file-input-${index}`).click()}
                        className="w-full aspect-video rounded-md border-2 border-dashed border-outline-variant/70 hover:border-primary/50 bg-surface-container-low flex flex-col items-center justify-center cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined text-[28px] text-outline">video_call</span>
                        <span className="font-body-sm text-[10px] text-on-surface-variant/80 mt-1">Upload video</span>
                      </div>
                    )}

                    <input
                      id={`video-file-input-${index}`}
                      type="file"
                      accept="video/*,.mov,.m4v"
                      onChange={(e) => handleVideoChange(index, e)}
                      disabled={converting}
                      className="hidden"
                    />

                    {hasVideo && !converting && (
                      <p className="font-body-sm text-[10px] text-on-surface-variant/80 font-mono truncate">{fileName}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || Object.keys(convertingProgress).length > 0}
              className="mt-6 self-start bg-primary text-on-primary font-label-caps text-label-caps px-8 py-3 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Videos'}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
