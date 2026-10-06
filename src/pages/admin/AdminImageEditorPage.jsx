import { useEffect, useRef, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';

const DEFAULT_ADJUSTMENTS = { brightness: 100, contrast: 100, saturation: 100 };

export default function AdminImageEditorPage() {
  const { showToast } = useToast();
  const [imageFile, setImageFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [rotation, setRotation] = useState(0); // 0 | 90 | 180 | 270
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [adjustments, setAdjustments] = useState(DEFAULT_ADJUSTMENTS);
  const [crop, setCrop] = useState(null); // { x, y, width, height } in base-canvas pixels
  const [cropDraft, setCropDraft] = useState(null); // in-progress drag rectangle, same shape
  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(90);

  // The decoded <img>, held in state (not a ref) so that finishing async
  // decode — which happens after the initial render that mounts the canvas —
  // actually triggers the draw effect below instead of silently going stale.
  const [loadedImage, setLoadedImage] = useState(null);
  const baseCanvasRef = useRef(null); // rotation/flip/filters applied, full (uncropped) size
  const previewCanvasRef = useRef(null); // what's shown and downloaded — baseCanvas, cropped if a crop is set
  const fileInputRef = useRef(null);
  const dragStartRef = useRef(null);

  useEffect(() => {
    if (!imageFile) {
      setLoadedImage(null);
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    const img = new Image();
    img.onload = () => {
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setCrop(null);
      setCropDraft(null);
      setLoadedImage(img);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Redraws the base (uncropped) canvas whenever rotation/flip/filters
  // change, then re-derives the cropped preview canvas from it — kept as two
  // passes so a crop rectangle (drawn in base-canvas coordinates) never has
  // to be recomputed when only a filter slider moves.
  useEffect(() => {
    const img = loadedImage;
    const base = baseCanvasRef.current;
    if (!img || !base) return;

    const swapped = rotation === 90 || rotation === 270;
    const w = swapped ? img.naturalHeight : img.naturalWidth;
    const h = swapped ? img.naturalWidth : img.naturalHeight;
    base.width = w;
    base.height = h;

    const ctx = base.getContext('2d');
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    redrawPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedImage, rotation, flipH, flipV, adjustments]);

  useEffect(() => {
    redrawPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crop]);

  function redrawPreview() {
    const base = baseCanvasRef.current;
    const preview = previewCanvasRef.current;
    if (!base || !preview) return;
    const region = crop ?? { x: 0, y: 0, width: base.width, height: base.height };
    preview.width = Math.max(1, Math.round(region.width));
    preview.height = Math.max(1, Math.round(region.height));
    const ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, preview.width, preview.height);
    ctx.drawImage(base, region.x, region.y, region.width, region.height, 0, 0, preview.width, preview.height);
  }

  const addFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast(`"${file?.name ?? 'File'}" is not an image.`);
      return;
    }
    setImageFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) addFile(e.dataTransfer.files[0]);
  };

  // Maps a pointer event to base-canvas pixel coordinates, the same way
  // AdminWatermarkPage's mask editor does, so a drag on the rendered
  // (possibly CSS-scaled) <canvas> element lines up with its true pixel grid.
  const getBaseCanvasPoint = (e) => {
    const base = baseCanvasRef.current;
    const rect = base.getBoundingClientRect();
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    const x = ((clientX - rect.left) / rect.width) * base.width;
    const y = ((clientY - rect.top) / rect.height) * base.height;
    return {
      x: Math.min(Math.max(x, 0), base.width),
      y: Math.min(Math.max(y, 0), base.height),
    };
  };

  const startCropDrag = (e) => {
    const point = getBaseCanvasPoint(e);
    dragStartRef.current = point;
    setCropDraft({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const updateCropDrag = (e) => {
    if (!dragStartRef.current) return;
    const point = getBaseCanvasPoint(e);
    const start = dragStartRef.current;
    setCropDraft({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    });
  };

  const endCropDrag = () => {
    dragStartRef.current = null;
  };

  const applyCrop = () => {
    if (!cropDraft || cropDraft.width < 4 || cropDraft.height < 4) {
      showToast('Drag a selection on the image first.');
      return;
    }
    setCrop(cropDraft);
    setCropDraft(null);
  };

  const clearCrop = () => {
    setCrop(null);
    setCropDraft(null);
  };

  const resetAll = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setCrop(null);
    setCropDraft(null);
  };

  const handleDownload = () => {
    const preview = previewCanvasRef.current;
    if (!preview) return;
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    preview.toBlob(
      (blob) => {
        if (!blob) {
          showToast('Could not export this image.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const baseName = (imageFile?.name || 'image').replace(/\.[^.]+$/, '');
        link.href = url;
        link.download = `${baseName}-edited.${format === 'jpeg' ? 'jpg' : 'png'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
      mimeType,
      format === 'jpeg' ? quality / 100 : undefined
    );
  };

  const activeCropRect = cropDraft ?? crop;
  const base = baseCanvasRef.current;
  const cropOverlayStyle = activeCropRect && base
    ? {
        left: `${(activeCropRect.x / base.width) * 100}%`,
        top: `${(activeCropRect.y / base.height) * 100}%`,
        width: `${(activeCropRect.width / base.width) * 100}%`,
        height: `${(activeCropRect.height / base.height) * 100}%`,
      }
    : null;

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <h1 className="admin-page-title">Image Editor</h1>
        <p className="admin-page-subtitle">
          Crop, rotate, flip, and adjust an image, then download it — entirely inside your browser.
        </p>
      </header>

      <main className="admin-main-container flex flex-col gap-8">
        {!imageFile ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`admin-card flex flex-col items-center justify-center gap-3 py-16 border-2 border-dashed cursor-pointer transition-colors ${
              dragActive ? 'border-primary bg-primary-container/20' : 'border-outline-variant'
            }`}
          >
            <span className="material-symbols-outlined text-5xl text-on-surface-variant">add_photo_alternate</span>
            <p className="font-body-lg text-body-lg text-on-surface">Drop an image here, or click to choose one</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && addFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="admin-card flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="admin-card-title">Original — drag to crop</h2>
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-[0.6875rem] font-label-caps text-label-caps uppercase text-error hover:underline"
                >
                  Choose a different image
                </button>
              </div>
              <div className="relative w-full bg-surface-container-lowest rounded-lg overflow-hidden">
                <canvas
                  ref={baseCanvasRef}
                  className="w-full h-auto block cursor-crosshair touch-none"
                  onMouseDown={startCropDrag}
                  onMouseMove={updateCropDrag}
                  onMouseUp={endCropDrag}
                  onMouseLeave={endCropDrag}
                  onTouchStart={startCropDrag}
                  onTouchMove={updateCropDrag}
                  onTouchEnd={endCropDrag}
                />
                {cropOverlayStyle && (
                  <div
                    className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
                    style={cropOverlayStyle}
                  />
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button type="button" onClick={applyCrop} className="btn btn-secondary text-[0.75rem]">
                  Apply Crop
                </button>
                {crop && (
                  <button type="button" onClick={clearCrop} className="btn btn-secondary text-[0.75rem]">
                    Clear Crop
                  </button>
                )}
              </div>

              <h2 className="admin-card-title mt-2">Preview</h2>
              <div className="w-full bg-surface-container-lowest rounded-lg overflow-hidden flex items-center justify-center">
                <canvas ref={previewCanvasRef} className="max-w-full h-auto block" />
              </div>
            </div>

            <div className="admin-card flex flex-col gap-5 h-fit">
              <div className="flex items-center justify-between">
                <h2 className="admin-card-title">Adjust</h2>
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-[0.6875rem] font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-primary"
                >
                  Reset All
                </button>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setRotation((r) => (r + 270) % 360)} className="btn btn-secondary flex-1 text-[0.75rem] flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[1rem]">rotate_left</span>
                  Rotate Left
                </button>
                <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)} className="btn btn-secondary flex-1 text-[0.75rem] flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[1rem]">rotate_right</span>
                  Rotate Right
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFlipH((v) => !v)}
                  className={`btn btn-secondary flex-1 text-[0.75rem] flex items-center justify-center gap-1.5 ${flipH ? 'border-primary text-primary' : ''}`}
                >
                  <span className="material-symbols-outlined text-[1rem]">flip</span>
                  Flip Horizontal
                </button>
                <button
                  type="button"
                  onClick={() => setFlipV((v) => !v)}
                  className={`btn btn-secondary flex-1 text-[0.75rem] flex items-center justify-center gap-1.5 ${flipV ? 'border-primary text-primary' : ''}`}
                >
                  <span className="material-symbols-outlined text-[1rem] rotate-90">flip</span>
                  Flip Vertical
                </button>
              </div>

              {[
                { key: 'brightness', label: 'Brightness' },
                { key: 'contrast', label: 'Contrast' },
                { key: 'saturation', label: 'Saturation' },
              ].map(({ key, label }) => (
                <div className="form-group" key={key}>
                  <label className="form-label flex justify-between" htmlFor={`adjust-${key}`}>
                    <span>{label}</span>
                    <span className="text-on-surface-variant">{adjustments[key]}%</span>
                  </label>
                  <input
                    id={`adjust-${key}`}
                    type="range"
                    min="0"
                    max="200"
                    value={adjustments[key]}
                    onChange={(e) => setAdjustments((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              ))}

              <div className="form-group">
                <label className="form-label" htmlFor="export-format">Download Format</label>
                <select
                  id="export-format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="form-select text-[0.75rem] py-2 px-3"
                >
                  <option value="png">PNG (lossless)</option>
                  <option value="jpeg">JPEG</option>
                </select>
              </div>
              {format === 'jpeg' && (
                <div className="form-group">
                  <label className="form-label flex justify-between" htmlFor="export-quality">
                    <span>Quality</span>
                    <span className="text-on-surface-variant">{quality}%</span>
                  </label>
                  <input
                    id="export-quality"
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              <button type="button" onClick={handleDownload} className="btn btn-primary flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[1.125rem]">download</span>
                Download Edited Image
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
