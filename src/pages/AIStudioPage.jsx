import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { removeBackground } from '@imgly/background-removal';

const PROMPT_SUGGESTIONS = [
  {
    label: '✨ Palace Courtyard',
    text: 'luxury Indian royal palace courtyard, warm sunset glow, detailed white marble pillars, soft focus bokeh background, professional editorial photography'
  },
  {
    label: '🌸 Pastel Minimalist',
    text: 'minimalist studio backdrop in soft dusty rose and gold accents, clean shadows, premium clothing catalog style'
  },
  {
    label: '🌿 Artisanal Nature',
    text: 'rustic hand-carved dark wood table, soft natural sunlight streaming through green leaves, depth of field, organic aesthetic'
  },
  {
    label: '💫 Festive Gold',
    text: 'golden festive ambient lights, abstract deep magenta silk fabric texture, sparkling bokeh, luxurious wedding celebration backdrop'
  }
];

export default function AIStudioPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState('');
  const [transparentUrl, setTransparentUrl] = useState('');
  const [generatedBgUrl, setGeneratedBgUrl] = useState('');
  const [mergedUrl, setMergedUrl] = useState('');
  
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [removeProgress, setRemoveProgress] = useState(0);
  const [removeStatus, setRemoveStatus] = useState('');
  
  const [bgPrompt, setBgPrompt] = useState(PROMPT_SUGGESTIONS[0].text);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  
  const [activeTab, setActiveTab] = useState('original'); // 'original', 'transparent', 'generated', 'final'
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef(null);

  // Clean up Object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (originalUrl && originalUrl.startsWith('blob:')) URL.revokeObjectURL(originalUrl);
      if (transparentUrl && transparentUrl.startsWith('blob:')) URL.revokeObjectURL(transparentUrl);
      if (mergedUrl && mergedUrl.startsWith('blob:')) URL.revokeObjectURL(mergedUrl);
    };
  }, [originalUrl, transparentUrl, mergedUrl]);

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setOriginalUrl(url);
      setTransparentUrl('');
      setGeneratedBgUrl('');
      setMergedUrl('');
      setActiveTab('original');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const handleRemoveBackground = async () => {
    if (!selectedFile) return;
    setIsRemovingBg(true);
    setRemoveProgress(0);
    setRemoveStatus('Loading AI model components (approx. 40MB on first run)...');

    try {
      const blob = await removeBackground(selectedFile, {
        progress: (key, current, total) => {
          const pct = Math.round((current / total) * 100);
          setRemoveProgress(pct);
          setRemoveStatus(`Downloading model file: ${pct}%`);
        }
      });
      
      setRemoveStatus('Analyzing and isolating foreground...');
      const url = URL.createObjectURL(blob);
      setTransparentUrl(url);
      setActiveTab('transparent');
    } catch (error) {
      console.error("Error removing background:", error);
      alert("Failed to remove background. Please try with a simpler image.");
    } finally {
      setIsRemovingBg(false);
      setRemoveProgress(0);
      setRemoveStatus('');
    }
  };

  const handleGenerateBackground = async () => {
    if (!transparentUrl) {
      alert("Please remove the background first to isolate your subject.");
      return;
    }
    if (!bgPrompt.trim()) {
      alert("Please enter a background prompt.");
      return;
    }

    setIsGeneratingBg(true);
    setActiveTab('final');

    try {
      // Fetch dynamic AI background using Pollinations AI
      const seed = Math.floor(Math.random() * 100000);
      const generatedUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(bgPrompt)}?width=800&height=800&nologo=true&seed=${seed}`;
      setGeneratedBgUrl(generatedUrl);

      // Pre-load background to ensure canvas doesn't fail
      await preloadImage(generatedUrl);

      // Merge background and transparent foreground
      const finalCompositeUrl = await mergeImages(transparentUrl, generatedUrl);
      setMergedUrl(finalCompositeUrl);
    } catch (error) {
      console.error("Error generating background:", error);
      alert("Failed to generate or merge background. Please try a different prompt.");
    } finally {
      setIsGeneratingBg(false);
    }
  };

  const preloadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error("Failed to load background image: " + e.message));
      img.src = src;
    });
  };

  const mergeImages = (fgBlobUrl, bgUrl) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');

      const bgImg = new Image();
      const fgImg = new Image();

      bgImg.crossOrigin = "anonymous";
      fgImg.crossOrigin = "anonymous";

      bgImg.onload = () => {
        // Draw background scaled to cover the 800x800 canvas
        const bgScale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
        const bgW = bgImg.width * bgScale;
        const bgH = bgImg.height * bgScale;
        const bgX = (canvas.width - bgW) / 2;
        const bgY = (canvas.height - bgH) / 2;
        ctx.drawImage(bgImg, bgX, bgY, bgW, bgH);

        fgImg.onload = () => {
          // Draw transparent foreground centered and scaled to sit elegantly
          const fgScale = Math.min(canvas.width / fgImg.width, canvas.height / fgImg.height) * 0.85;
          const fgW = fgImg.width * fgScale;
          const fgH = fgImg.height * fgScale;
          const fgX = (canvas.width - fgW) / 2;
          
          // Align product/subject to the bottom floor
          const fgY = canvas.height - fgH - 40; 
          ctx.drawImage(fgImg, fgX, fgY, fgW, fgH);

          resolve(canvas.toDataURL('image/png'));
        };
        fgImg.onerror = (e) => reject(new Error("Failed to load foreground: " + e.message));
        fgImg.src = fgBlobUrl;
      };
      bgImg.onerror = (e) => reject(new Error("Failed to load background: " + e.message));
      bgImg.src = bgUrl;
    });
  };

  const downloadResult = () => {
    if (!mergedUrl) return;
    const link = document.createElement('a');
    link.href = mergedUrl;
    link.download = `A2Z-AIStudio-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6">
        <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-on-surface">AI Background Studio</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Isolate subject/product photos and generate gorgeous luxury backdrops using AI.
        </p>
      </header>

      {/* Main Studio Body */}
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full font-label-caps text-[11px] uppercase tracking-wider font-semibold">
            Creative AI Studio
          </span>
          <h1 className="font-headline-md text-3xl md:text-4xl playfair text-on-surface mt-4 mb-3">
            AI Background Replacement Studio
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Isolate your outfit or product and place it in a luxury, AI-generated background. No manual editing required.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left panel: Upload & Generation Inputs (5 Columns) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Step 1: Upload */}
            <div className="bg-surface-container-low/75 border border-tertiary-container/30 backdrop-blur-md rounded-xl p-6 shadow-sm">
              <h2 className="font-title-sm text-title-sm text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">upload_file</span>
                1. Upload Subject Photo
              </h2>

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 transition-all cursor-pointer ${
                  dragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-outline-variant/60 hover:border-primary/50 bg-white/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="material-symbols-outlined text-4xl text-outline mb-2">image</span>
                <p className="font-body-sm text-body-sm text-on-surface font-semibold">
                  Drag &amp; drop subject image
                </p>
                <p className="font-body-sm text-[12px] text-on-surface-variant mt-1">
                  PNG, JPG, or WEBP with clear subjects
                </p>
              </div>

              {selectedFile && (
                <div className="flex items-center gap-3 mt-4 bg-white/60 border border-outline-variant/30 rounded-xl p-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-surface-container">
                    <img src={originalUrl} className="w-full h-full object-cover" alt="Subject preview" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body-sm text-body-sm font-semibold truncate text-on-surface">{selectedFile.name}</p>
                    <p className="font-body-sm text-[11px] text-on-surface-variant">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setOriginalUrl('');
                      setTransparentUrl('');
                      setGeneratedBgUrl('');
                      setMergedUrl('');
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-error hover:bg-error/15 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Remove BG */}
            <div className="bg-surface-container-low/75 border border-tertiary-container/30 backdrop-blur-md rounded-xl p-6 shadow-sm">
              <h2 className="font-title-sm text-title-sm text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">blur_off</span>
                2. Background Removal
              </h2>
              
              <button
                type="button"
                onClick={handleRemoveBackground}
                disabled={!selectedFile || isRemovingBg}
                className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-4 rounded-xl uppercase tracking-wider hover:bg-surface-tint transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isRemovingBg ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-t-transparent border-on-primary rounded-full"></span>
                    Removing Background...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">cut</span>
                    Isolate Subject (Remove Background)
                  </>
                )}
              </button>

              {isRemovingBg && (
                <div className="mt-4">
                  <div className="w-full bg-white/40 rounded-full h-1.5 mb-2 overflow-hidden border border-outline-variant/30">
                    <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${removeProgress}%` }} />
                  </div>
                  <p className="font-body-sm text-[11px] text-primary font-medium animate-pulse">{removeStatus}</p>
                </div>
              )}

              {transparentUrl && !isRemovingBg && (
                <div className="mt-3 flex items-center gap-1.5 text-secondary font-body-sm text-[12px]">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Subject isolated successfully! Ready for backdrop addition.</span>
                </div>
              )}
            </div>

            {/* Step 3: Add/Generate BG */}
            <div className="bg-surface-container-low/75 border border-tertiary-container/30 backdrop-blur-md rounded-xl p-6 shadow-sm">
              <h2 className="font-title-sm text-title-sm text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">palette</span>
                3. Add Custom AI Background
              </h2>

              <div className="mb-4">
                <label className="block font-label-caps text-[10px] text-on-surface-variant mb-1.5 uppercase tracking-wider" htmlFor="bg-prompt-input">
                  Describe the background scenery
                </label>
                <textarea
                  id="bg-prompt-input"
                  rows={3}
                  value={bgPrompt}
                  onChange={(e) => setBgPrompt(e.target.value)}
                  placeholder="e.g. Luxury marble tabletop inside a modern sunlit boutique, blurred floral background"
                  className="w-full bg-white/40 border border-outline-variant/40 rounded-xl px-4 py-3 font-body-sm text-body-sm text-on-surface focus:border-primary focus:ring-0 transition-colors"
                />
              </div>

              <div className="mb-5">
                <span className="block font-label-caps text-[10px] text-on-surface-variant mb-2 uppercase tracking-wider">
                  Suggestions (Tap to use)
                </span>
                <div className="flex flex-wrap gap-2">
                  {PROMPT_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => setBgPrompt(suggestion.text)}
                      className={`text-body-sm text-[12px] px-3 py-1.5 rounded-full border transition-all ${
                        bgPrompt === suggestion.text
                          ? 'bg-primary/10 border-primary text-primary font-semibold'
                          : 'bg-white/40 border-outline-variant/50 hover:bg-white/70 text-on-surface-variant'
                      }`}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateBackground}
                disabled={!transparentUrl || isGeneratingBg || !bgPrompt.trim()}
                className="w-full bg-secondary text-on-secondary font-label-caps text-label-caps py-4 rounded-xl uppercase tracking-wider hover:opacity-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGeneratingBg ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-t-transparent border-on-secondary rounded-full"></span>
                    Generating AI Backdrop...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">brush</span>
                    Generate Background &amp; Merge
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Right panel: Active Studio Canvas Preview (7 Columns) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-surface-container-low/75 border border-tertiary-container/30 backdrop-blur-md rounded-xl p-6 shadow-sm flex-1 flex flex-col min-h-[480px]">
              <div className="flex justify-between items-center mb-6 border-b border-outline-variant/30 pb-4">
                <h3 className="font-title-sm text-title-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-primary">analytics</span>
                  Studio Live View
                </h3>

                {/* Tabs to view different stages */}
                <div className="flex gap-1.5 bg-white/40 rounded-full p-1 border border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => setActiveTab('original')}
                    disabled={!originalUrl}
                    className={`px-3.5 py-1.5 rounded-full font-label-caps text-[10px] uppercase transition-colors ${
                      activeTab === 'original'
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface-variant hover:text-primary disabled:opacity-30'
                    }`}
                  >
                    Original
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('transparent')}
                    disabled={!transparentUrl}
                    className={`px-3.5 py-1.5 rounded-full font-label-caps text-[10px] uppercase transition-colors ${
                      activeTab === 'transparent'
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface-variant hover:text-primary disabled:opacity-30'
                    }`}
                  >
                    Isolated
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('generated')}
                    disabled={!generatedBgUrl}
                    className={`px-3.5 py-1.5 rounded-full font-label-caps text-[10px] uppercase transition-colors ${
                      activeTab === 'generated'
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface-variant hover:text-primary disabled:opacity-30'
                    }`}
                  >
                    Backdrop
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('final')}
                    disabled={!mergedUrl}
                    className={`px-3.5 py-1.5 rounded-full font-label-caps text-[10px] uppercase transition-colors ${
                      activeTab === 'final'
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface-variant hover:text-primary disabled:opacity-30'
                    }`}
                  >
                    Final Art
                  </button>
                </div>
              </div>

              {/* Interactive Sandbox Showcase */}
              <div className="flex-1 flex items-center justify-center bg-white/30 rounded-xl border border-outline-variant/30 overflow-hidden relative min-h-[350px] aspect-square mx-auto w-full max-w-[500px]">
                {/* Fallback state when idle */}
                {!originalUrl && (
                  <div className="text-center p-8 text-on-surface-variant/60 flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-5xl text-outline-variant">photo_library</span>
                    <p className="font-body-sm text-body-sm max-w-xs">
                      No image uploaded yet. Upload a photo in Step 1 to begin editing.
                    </p>
                  </div>
                )}

                {/* Tab: Original */}
                {originalUrl && activeTab === 'original' && (
                  <img src={originalUrl} className="w-full h-full object-contain p-4" alt="Original Upload" />
                )}

                {/* Tab: Isolated Foreground (shows chess checker background to emphasize transparency) */}
                {transparentUrl && activeTab === 'transparent' && (
                  <div className="w-full h-full p-4 relative" style={{
                    backgroundImage: 'radial-gradient(circle, #e5e7eb 25%, transparent 26%), radial-gradient(circle, #e5e7eb 25%, #ffffff 26%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 10px 10px'
                  }}>
                    <img src={transparentUrl} className="w-full h-full object-contain" alt="Transparent foreground" />
                  </div>
                )}

                {/* Tab: Generated Background (Backdrop only) */}
                {generatedBgUrl && activeTab === 'generated' && (
                  <div className="w-full h-full relative">
                    <img src={generatedBgUrl} className="w-full h-full object-cover" alt="AI Generated Backdrop" />
                    {isGeneratingBg && (
                      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center">
                          <span className="animate-spin inline-block w-8 h-8 border-4 border-t-transparent border-primary rounded-full mb-3"></span>
                          <p className="text-white font-body-sm text-body-sm">Dreaming up background...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Final Composite Art */}
                {activeTab === 'final' && (
                  <div className="w-full h-full relative">
                    {mergedUrl ? (
                      <img src={mergedUrl} className="w-full h-full object-contain" alt="AI Composite Art" />
                    ) : (
                      originalUrl && (
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-6 text-center text-white">
                          <span className="material-symbols-outlined text-4xl text-white/70 mb-3 font-light animate-pulse">auto_awesome</span>
                          <p className="font-body-sm text-body-sm mb-4">
                            Isolate the subject in Step 2, then write a prompt and hit "Generate Background" in Step 3 to compose the artwork!
                          </p>
                        </div>
                      )
                    )}

                    {isGeneratingBg && (
                      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center">
                          <span className="animate-spin inline-block w-8 h-8 border-4 border-t-transparent border-primary rounded-full mb-3"></span>
                          <p className="text-white font-body-sm text-body-sm">Rendering studio composition...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons below preview */}
              {mergedUrl && activeTab === 'final' && (
                <div className="mt-6 flex gap-4">
                  <button
                    type="button"
                    onClick={downloadResult}
                    className="flex-1 bg-primary text-on-primary font-label-caps text-label-caps py-4 rounded-xl uppercase tracking-wider hover:bg-surface-tint transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[20px]">download</span>
                    Download Composite Image
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateBackground}
                    className="bg-white/50 border border-outline-variant hover:bg-white/80 text-on-surface font-label-caps text-label-caps px-6 py-4 rounded-xl uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">replay</span>
                    Regenerate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
