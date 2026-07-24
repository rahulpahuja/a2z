import { useState, useRef, useEffect } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import './AdminWatermarkPage.css';

export default function AdminWatermarkPage() {
  const { showToast } = useToast();
  
  // Tab states: 'remover' | 'adder'
  const [activeStudioTab, setActiveStudioTab] = useState('remover');

  // Shared Upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalUrl, setOriginalUrl] = useState('');
  
  // Loaded image reference for drawing
  const loadedImageRef = useRef(null);

  // --- REMOVER STATES ---
  const [brushSize, setBrushSize] = useState(24);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasMask, setHasMask] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  const [compareRatio, setCompareRatio] = useState(50);
  const [maskHistory, setMaskHistory] = useState([]);

  // --- ADDER STATES ---
  const [watermarkType, setWatermarkType] = useState('text'); // 'text' | 'image'
  const [watermarkText, setWatermarkText] = useState('© A2Z Collection');
  const [watermarkColor, setWatermarkColor] = useState('#ffffff');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.6);
  const [watermarkFontSize, setWatermarkFontSize] = useState(32);
  const [watermarkImageFile, setWatermarkImageFile] = useState(null);
  const [watermarkImageUrl, setWatermarkImageUrl] = useState('');
  const loadedWatermarkImageRef = useRef(null);

  // Selection box state in pixels on canvas
  const [selectionBox, setSelectionBox] = useState(null);
  const [isDrawingBox, setIsDrawingBox] = useState(false);
  const [startBoxPos, setStartBoxPos] = useState(null);

  // Refs
  const containerRef = useRef(null);
  const imageCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const brushPreviewRef = useRef(null);

  // Cleanup Urls
  useEffect(() => {
    return () => {
      if (originalUrl && originalUrl.startsWith('blob:')) URL.revokeObjectURL(originalUrl);
      if (resultUrl && resultUrl.startsWith('blob:')) URL.revokeObjectURL(resultUrl);
      if (watermarkImageUrl && watermarkImageUrl.startsWith('blob:')) URL.revokeObjectURL(watermarkImageUrl);
    };
  }, [originalUrl, resultUrl, watermarkImageUrl]);

  // Redraw canvas on layout tab switches or parameter tweaks
  useEffect(() => {
    if (imageLoaded && loadedImageRef.current) {
      if (activeStudioTab === 'adder') {
        // Automatically place default box if none drawn
        const canvas = imageCanvasRef.current;
        if (canvas && !selectionBox) {
          setSelectionBox({
            x: Math.round(canvas.width * 0.15),
            y: Math.round(canvas.height * 0.4),
            width: Math.round(canvas.width * 0.7),
            height: Math.round(canvas.height * 0.2),
          });
        }
      }
      redrawWorkspace();
    }
  }, [activeStudioTab, imageLoaded]);

  // Redraw when adder parameters update
  useEffect(() => {
    if (activeStudioTab === 'adder' && imageLoaded) {
      redrawWorkspace();
    }
  }, [watermarkType, watermarkText, watermarkColor, watermarkOpacity, watermarkFontSize, watermarkImageUrl, selectionBox]);

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setImageLoaded(false);
      setResultUrl('');
      setHasMask(false);
      setMaskHistory([]);
      setSelectionBox(null);
      
      const url = URL.createObjectURL(file);
      setOriginalUrl(url);
      
      const img = new Image();
      img.onload = () => {
        loadedImageRef.current = img;
        setupCanvases(img);
      };
      img.src = url;
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  const setupCanvases = (img) => {
    const canvasImg = imageCanvasRef.current;
    const canvasMask = maskCanvasRef.current;
    if (!canvasImg || !canvasMask) return;
    
    const maxDim = 800;
    let width = img.width;
    let height = img.height;
    
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }
    
    canvasImg.width = width;
    canvasImg.height = height;
    canvasMask.width = width;
    canvasMask.height = height;
    
    redrawWorkspace();
    
    // Clear mask canvas
    const ctxMask = canvasMask.getContext('2d');
    ctxMask.clearRect(0, 0, width, height);
    
    setImageLoaded(true);
  };

  // Central draw coordination
  const redrawWorkspace = () => {
    const canvasImg = imageCanvasRef.current;
    if (!canvasImg || !loadedImageRef.current) return;
    const ctx = canvasImg.getContext('2d');
    const w = canvasImg.width;
    const h = canvasImg.height;
    
    // 1. Draw base clean photo
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(loadedImageRef.current, 0, 0, w, h);
    
    // 2. If in watermark adder tab, overlay the watermark live
    if (activeStudioTab === 'adder' && selectionBox) {
      drawWatermarkOverlay(ctx, selectionBox, true);
    }
  };

  const drawWatermarkOverlay = (ctx, box, drawIndicator = false) => {
    ctx.save();
    ctx.globalAlpha = watermarkOpacity;
    
    if (watermarkType === 'text' && watermarkText) {
      ctx.fillStyle = watermarkColor;
      ctx.font = `bold ${watermarkFontSize}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(watermarkText, box.x + box.width / 2, box.y + box.height / 2);
    } else if (watermarkType === 'image' && loadedWatermarkImageRef.current) {
      ctx.drawImage(loadedWatermarkImageRef.current, box.x, box.y, box.width, box.height);
    }
    
    ctx.restore();

    // Draw selection dashed indicator borders
    if (drawIndicator) {
      ctx.save();
      ctx.strokeStyle = '#AC2471';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.restore();
    }
  };

  // Watermark logo upload
  const handleWatermarkImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setWatermarkImageFile(file);
      const url = URL.createObjectURL(file);
      setWatermarkImageUrl(url);
      
      const img = new Image();
      img.onload = () => {
        loadedWatermarkImageRef.current = img;
        redrawWorkspace();
      };
      img.src = url;
    }
  };

  // Mouse / Touch Coordinates resolver
  const getCanvasMousePos = (e) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  // Event handlers
  const handleStartDraw = (e) => {
    if (!imageLoaded || isProcessing) return;
    e.preventDefault();
    
    const pos = getCanvasMousePos(e);

    if (activeStudioTab === 'remover') {
      setIsDrawing(true);
      saveMaskState();
      
      const ctx = maskCanvasRef.current.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.stroke();
      setHasMask(true);
    } else {
      // Drawing watermark placement box
      setIsDrawingBox(true);
      setStartBoxPos(pos);
      setSelectionBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
    }
  };

  const handleDrawing = (e) => {
    if (activeStudioTab === 'remover') {
      if (!isDrawing) {
        updateBrushPreview(e);
        return;
      }
      e.preventDefault();
      const ctx = maskCanvasRef.current.getContext('2d');
      const pos = getCanvasMousePos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.stroke();
    } else {
      if (!isDrawingBox || !startBoxPos) return;
      e.preventDefault();
      const pos = getCanvasMousePos(e);
      
      const x = Math.min(startBoxPos.x, pos.x);
      const y = Math.min(startBoxPos.y, pos.y);
      const width = Math.abs(startBoxPos.x - pos.x);
      const height = Math.abs(startBoxPos.y - pos.y);
      
      setSelectionBox({ x, y, width, height });
    }
  };

  const handleStopDraw = () => {
    setIsDrawing(false);
    setIsDrawingBox(false);
  };

  const updateBrushPreview = (e) => {
    const preview = brushPreviewRef.current;
    const container = containerRef.current;
    if (!preview || !container || !imageLoaded) return;
    
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      preview.style.display = 'block';
      preview.style.left = `${x}px`;
      preview.style.top = `${y}px`;
      preview.style.width = `${brushSize}px`;
      preview.style.height = `${brushSize}px`;
    } else {
      preview.style.display = 'none';
    }
  };

  const handleMouseLeave = () => {
    setIsDrawing(false);
    setIsDrawingBox(false);
    if (brushPreviewRef.current) {
      brushPreviewRef.current.style.display = 'none';
    }
  };

  // Remover Mask actions
  const saveMaskState = () => {
    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setMaskHistory((prev) => [...prev, state]);
  };

  const handleUndo = () => {
    if (maskHistory.length === 0) return;
    const previousState = maskHistory[maskHistory.length - 1];
    setMaskHistory((prev) => prev.slice(0, -1));
    
    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(previousState, 0, 0);
    
    const pixels = previousState.data;
    let active = false;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 0) {
        active = true;
        break;
      }
    }
    setHasMask(active);
    showToast('Undo applied.');
  };

  const handleClearMask = () => {
    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasMask(false);
    setMaskHistory([]);
    showToast('Mask cleared.');
  };

  // AI Inpainting Remover Algorithm
  const handleRemoveWatermark = async () => {
    if (!imageLoaded || !hasMask) return;
    setIsProcessing(true);
    
    await new Promise((resolve) => setTimeout(resolve, 150));
    
    try {
      const imgCanvas = imageCanvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      
      const width = imgCanvas.width;
      const height = imgCanvas.height;
      
      const ctxImg = imgCanvas.getContext('2d');
      const ctxMask = maskCanvas.getContext('2d');
      
      // Copy base clean image (excluding any adder overlays)
      ctxImg.clearRect(0, 0, width, height);
      ctxImg.drawImage(loadedImageRef.current, 0, 0, width, height);
      
      const imgData = ctxImg.getImageData(0, 0, width, height);
      const maskData = ctxMask.getImageData(0, 0, width, height);
      
      const imgPixels = imgData.data;
      const maskPixels = maskData.data;
      
      const workingBuffer = new Uint8ClampedArray(imgPixels);
      const isMasked = new Uint8Array(width * height);
      
      let totalMasked = 0;
      for (let i = 0; i < maskPixels.length; i += 4) {
        if (maskPixels[i + 3] > 10) {
          isMasked[i / 4] = 1;
          totalMasked++;
        }
      }
      
      if (totalMasked === 0) {
        setIsProcessing(false);
        showToast('Draw a line over the watermark first.');
        return;
      }
      
      const iterations = 80;
      for (let iter = 0; iter < iterations; iter++) {
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            if (isMasked[idx]) {
              let rSum = 0, gSum = 0, bSum = 0;
              let count = 0;
              
              const neighbors = [idx - 1, idx + 1, idx - width, idx + width];
              for (let n of neighbors) {
                rSum += workingBuffer[n * 4];
                gSum += workingBuffer[n * 4 + 1];
                bSum += workingBuffer[n * 4 + 2];
                count++;
              }
              
              if (count > 0) {
                workingBuffer[idx * 4] = Math.round(rSum / count);
                workingBuffer[idx * 4 + 1] = Math.round(gSum / count);
                workingBuffer[idx * 4 + 2] = Math.round(bSum / count);
              }
            }
          }
        }
      }
      
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = width;
      outputCanvas.height = height;
      const outCtx = outputCanvas.getContext('2d');
      const finalImgData = new ImageData(workingBuffer, width, height);
      outCtx.putImageData(finalImgData, 0, 0);
      
      outputCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setResultUrl(url);
          showToast('Watermark removed using AI boundary inpainting!');
        }
        setIsProcessing(false);
      }, 'image/jpeg', 0.95);
      
    } catch (err) {
      showToast(`AI Inpainting failed: ${err.message}`);
      setIsProcessing(false);
    }
  };

  // Watermark Adder Apply & Download
  const handleApplyAndDownloadWatermark = () => {
    if (!imageLoaded || !selectionBox) return;
    
    const canvas = imageCanvasRef.current;
    const width = canvas.width;
    const height = canvas.height;
    
    // Create clean final canvas
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = width;
    finalCanvas.height = height;
    const finalCtx = finalCanvas.getContext('2d');
    
    // Draw clean base image
    finalCtx.drawImage(loadedImageRef.current, 0, 0, width, height);
    
    // Draw watermark overlay (WITHOUT dashed indicator)
    drawWatermarkOverlay(finalCtx, selectionBox, false);
    
    // Trigger download
    finalCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `watermarked_${selectedFile?.name || 'product_photo.jpg'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Watermarked image downloaded.');
      }
    }, 'image/jpeg', 0.95);
  };

  const handleDownloadRemoverResult = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `watermark_removed_${selectedFile?.name || 'image.jpg'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSliderDrag = (e) => {
    const slider = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = clientX - slider.left;
    const pct = Math.max(0, Math.min(100, (x / slider.width) * 100));
    setCompareRatio(pct);
  };

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <h1 className="admin-page-title">AI Watermark Studio</h1>
        <p className="admin-page-subtitle">
          Professional watermark tools for administrators. Dissolve watermarks using AI inpainting, or overlay customizable text and brand logos.
        </p>
      </header>

      {/* Tab Switcher */}
      <div className="flex bg-surface-container rounded-lg p-1 border border-outline-variant/35 w-full max-w-md mb-8">
        <button
          type="button"
          onClick={() => {
            setActiveStudioTab('remover');
            setResultUrl('');
          }}
          className={`flex-1 text-center font-label-caps text-[10px] uppercase py-2.5 rounded-md transition-all ${
            activeStudioTab === 'remover' 
              ? 'bg-surface shadow text-primary font-bold' 
              : 'text-on-surface-variant hover:text-on-surface font-medium'
          }`}
        >
          Watermark Remover (AI)
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveStudioTab('adder');
            setResultUrl('');
          }}
          className={`flex-1 text-center font-label-caps text-[10px] uppercase py-2.5 rounded-md transition-all ${
            activeStudioTab === 'adder' 
              ? 'bg-surface shadow text-primary font-bold' 
              : 'text-on-surface-variant hover:text-on-surface font-medium'
          }`}
        >
          Watermark Adder
        </button>
      </div>

      <main className="admin-main-container grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column tools & configuration */}
        <section className="flex flex-col gap-6">
          
          {/* Uploader Card */}
          <div className="admin-card flex flex-col gap-5">
            <h2 className="admin-card-title flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">filter_hdr</span>
              Select Product Photo
            </h2>
            
            <div className="form-group">
              <label className="form-label" htmlFor="image-file">
                Upload image file
              </label>
              <input
                id="image-file"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="form-input text-[12px] py-2 px-3"
              />
            </div>
            
            {imageLoaded && activeStudioTab === 'remover' && (
              /* Remover Options */
              <div className="space-y-4 border-t border-outline-variant/35 pt-4">
                <div className="form-group">
                  <div className="flex justify-between items-center mb-1">
                    <label className="form-label mb-0" htmlFor="brush-slider">
                      Brush Size ({brushSize}px)
                    </label>
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      Adjust thickness
                    </span>
                  </div>
                  <input
                    id="brush-slider"
                    type="range"
                    min="6"
                    max="64"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={maskHistory.length === 0 || isProcessing}
                    className="flex-1 btn btn-secondary text-[11px] py-2 px-3 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">undo</span>
                    Undo
                  </button>
                  <button
                    type="button"
                    onClick={handleClearMask}
                    disabled={!hasMask || isProcessing}
                    className="flex-1 btn btn-secondary text-[11px] py-2 px-3 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                    Clear Mask
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveWatermark}
                  disabled={!hasMask || isProcessing}
                  className="w-full btn btn-primary text-[12px] py-3 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Processing AI Removal...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                      Remove Watermark (AI)
                    </>
                  )}
                </button>
              </div>
            )}

            {imageLoaded && activeStudioTab === 'adder' && (
              /* Adder Options */
              <div className="space-y-4 border-t border-outline-variant/35 pt-4">
                
                {/* Watermark Type Selector */}
                <div className="form-group">
                  <label className="form-label">Watermark Type</label>
                  <div className="flex bg-surface-container rounded-lg p-1 border border-outline-variant/20 w-full">
                    <button
                      type="button"
                      onClick={() => setWatermarkType('text')}
                      className={`flex-1 text-center text-[11px] py-1.5 rounded-md transition-all ${
                        watermarkType === 'text' 
                          ? 'bg-surface shadow text-primary font-semibold' 
                          : 'text-on-surface-variant hover:text-on-surface font-medium'
                      }`}
                    >
                      Text overlay
                    </button>
                    <button
                      type="button"
                      onClick={() => setWatermarkType('image')}
                      className={`flex-1 text-center text-[11px] py-1.5 rounded-md transition-all ${
                        watermarkType === 'image' 
                          ? 'bg-surface shadow text-primary font-semibold' 
                          : 'text-on-surface-variant hover:text-on-surface font-medium'
                      }`}
                    >
                      Logo image
                    </button>
                  </div>
                </div>

                {watermarkType === 'text' ? (
                  /* Text Watermark Parameters */
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor="wm-text">Watermark Text</label>
                      <input
                        id="wm-text"
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        className="form-input text-[12px] py-2 px-3"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label" htmlFor="wm-color">Text Color</label>
                      <div className="flex gap-2 items-center">
                        <input
                          id="wm-color"
                          type="color"
                          value={watermarkColor}
                          onChange={(e) => setWatermarkColor(e.target.value)}
                          className="w-10 h-10 rounded border border-outline-variant cursor-pointer p-0 bg-transparent"
                        />
                        <input
                          type="text"
                          value={watermarkColor}
                          onChange={(e) => setWatermarkColor(e.target.value)}
                          className="form-input text-[11px] py-1.5 px-3 flex-1"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="font-slider">
                        Font Size ({watermarkFontSize}px)
                      </label>
                      <input
                        id="font-slider"
                        type="range"
                        min="12"
                        max="72"
                        value={watermarkFontSize}
                        onChange={(e) => setWatermarkFontSize(Number(e.target.value))}
                        className="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </>
                ) : (
                  /* Image Watermark Parameters */
                  <div className="form-group">
                    <label className="form-label" htmlFor="wm-logo-file">Select Brand Logo (PNG recommended)</label>
                    <input
                      id="wm-logo-file"
                      type="file"
                      accept="image/*"
                      onChange={handleWatermarkImageChange}
                      className="form-input text-[12px] py-2 px-3"
                    />
                  </div>
                )}

                {/* Opacity Slider */}
                <div className="form-group">
                  <label className="form-label" htmlFor="opacity-slider">
                    Watermark Opacity ({Math.round(watermarkOpacity * 100)}%)
                  </label>
                  <input
                    id="opacity-slider"
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                    className="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Apply/Download buttons */}
                <button
                  type="button"
                  onClick={handleApplyAndDownloadWatermark}
                  disabled={watermarkType === 'image' && !watermarkImageUrl}
                  className="w-full btn btn-primary text-[12px] py-3 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Apply &amp; Download Watermark
                </button>
              </div>
            )}
          </div>
          
          {/* Instructions card */}
          <div className="admin-card flex flex-col gap-3">
            <h3 className="font-bold text-on-surface text-[13px] flex items-center gap-1">
              <span className="material-symbols-outlined text-primary text-[16px]">info</span>
              How it works
            </h3>
            {activeStudioTab === 'remover' ? (
              <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-on-surface-variant/90 leading-relaxed">
                <li>Upload a product photo containing a logo, watermark, or text overlay.</li>
                <li>Paint a red highlight mask directly over the watermark region.</li>
                <li>Adjust the <strong>Brush Size</strong> slider for thinner or thicker overlay strokes.</li>
                <li>Click <strong>Remove Watermark (AI)</strong>. The system will smooth out the watermark.</li>
              </ol>
            ) : (
              <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-on-surface-variant/90 leading-relaxed">
                <li>Upload a base product photo.</li>
                <li>Select watermark type (Text or Brand Logo image).</li>
                <li><strong>Click and drag a box</strong> on the image canvas to select the area where the watermark should sit.</li>
                <li>Customize color, text size, and transparency parameters on the left.</li>
                <li>Click <strong>Apply &amp; Download</strong> to save your watermarked image.</li>
              </ol>
            )}
          </div>
        </section>

        {/* Right column editor canvas / result side-by-side */}
        <section className="lg:col-span-2 flex flex-col gap-6">
          
          {!originalUrl ? (
            <div className="admin-card flex flex-col items-center justify-center min-h-[360px] border-2 border-dashed border-outline-variant/60 rounded-2xl p-8 bg-surface-container-low/40">
              <span className="material-symbols-outlined text-[54px] text-outline mb-4">photo_library</span>
              <p className="font-title-sm text-on-surface text-center mb-1">No Image Selected</p>
              <p className="text-body-sm text-[11px] text-on-surface-variant text-center max-w-xs mb-4">
                Select a JPEG, PNG, or WebP photo to launch the editor canvas workspace.
              </p>
              <button
                onClick={() => document.getElementById('image-file').click()}
                className="btn btn-secondary text-[11px] py-2 px-4"
              >
                Choose Photo
              </button>
            </div>
          ) : (
            <div className="admin-card flex flex-col gap-5">
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant/20">
                <span className="font-bold text-on-surface text-[14px]">
                  {activeStudioTab === 'adder' 
                    ? 'Watermark Placement Area (Drag to draw custom box)' 
                    : !resultUrl ? 'Editor Canvas' : 'Before / After Comparison'
                  }
                </span>
                {resultUrl && activeStudioTab === 'remover' && (
                  <button
                    onClick={handleDownloadRemoverResult}
                    className="btn btn-primary text-[11px] py-2 px-4 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">download</span>
                    Download Inpainted Result
                  </button>
                )}
              </div>

              {activeStudioTab === 'remover' && resultUrl ? (
                /* Comparison slider result */
                <div 
                  className="comparison-slider-container cursor-ew-resize"
                  onMouseMove={handleSliderDrag}
                  onTouchMove={handleSliderDrag}
                  onClick={handleSliderDrag}
                >
                  <img src={originalUrl} className="compare-img" alt="Before" />
                  <div 
                    className="compare-overlay"
                    style={{ clipPath: `polygon(${compareRatio}% 0, 100% 0, 100% 100%, ${compareRatio}% 100%)` }}
                  >
                    <img src={resultUrl} className="compare-img" alt="After" />
                  </div>
                  <div className="slider-handle" style={{ left: `${compareRatio}%` }}>
                    <div className="slider-handle-button">
                      <span className="material-symbols-outlined text-[18px]">unfold_more</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Drawing canvas editor (Shared for Remover Brush and Adder Selection box) */
                <div 
                  ref={containerRef}
                  onMouseMove={handleDrawing}
                  onTouchMove={handleDrawing}
                  onMouseUp={handleStopDraw}
                  onTouchEnd={handleStopDraw}
                  onMouseLeave={handleMouseLeave}
                  className="watermark-canvas-container relative cursor-crosshair mx-auto"
                >
                  <canvas ref={imageCanvasRef} className="max-w-full h-auto block rounded-lg" />
                  <canvas 
                    ref={maskCanvasRef} 
                    onMouseDown={handleStartDraw}
                    onTouchStart={handleStartDraw}
                    className="canvas-layer" 
                  />
                  {activeStudioTab === 'remover' && (
                    <div ref={brushPreviewRef} className="brush-preview" />
                  )}
                </div>
              )}

              {resultUrl && activeStudioTab === 'remover' && (
                <div className="flex justify-center gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setResultUrl('');
                      setTimeout(() => {
                        const img = new Image();
                        img.onload = () => setupCanvases(img);
                        img.src = originalUrl;
                      }, 50);
                    }}
                    className="btn btn-secondary text-[11px] py-2 px-5"
                  >
                    Modify Mask / Paint Again
                  </button>
                </div>
              )}

            </div>
          )}

        </section>

      </main>
    </div>
  );
}
