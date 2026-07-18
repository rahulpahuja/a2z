import { useState, useRef } from 'react';
import { convertToWebP, validateWebPSignature } from '../../utils/imageConverter.js';
import { useToast } from '../../context/ToastContext.jsx';
import './AdminImageConverterPage.css';

export default function AdminImageConverterPage() {
  const { showToast } = useToast();
  const [files, setFiles] = useState([]);
  const [quality, setQuality] = useState(80);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Diagnostic Test States
  const [testStatus, setTestStatus] = useState(null); // 'running', 'passed', 'failed'
  const [testDetails, setTestDetails] = useState(null);

  // Programmatic diagnostic self-test validator
  const runSelfTest = async () => {
    setTestStatus('running');
    setTestDetails(null);
    try {
      // 1. Generate a mock PNG programmatically on a temporary canvas
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context not supported');
      }

      // Draw a test image
      ctx.fillStyle = '#ac2471'; // Brand primary
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(100, 100, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#486730'; // Brand secondary
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('A2Z TEST', 100, 105);

      // Convert Canvas to a PNG Blob
      const pngBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('PNG Blob generation failed'));
        }, 'image/png');
      });

      // 2. Feed it into our converter module
      const conversionResult = await convertToWebP(
        new File([pngBlob], 'test-diagnostic.png', { type: 'image/png' }),
        quality / 100
      );

      // 3. Verify the WebP file header bytes
      const isValidWebP = await validateWebPSignature(conversionResult.blob);

      if (isValidWebP) {
        setTestStatus('passed');
        setTestDetails({
          originalSize: pngBlob.size,
          newSize: conversionResult.blob.size,
          savings: conversionResult.savings.toFixed(1),
          url: conversionResult.url,
        });
        showToast('Self-Diagnostic Test Passed: WebP signature verified.');
      } else {
        setTestStatus('failed');
        showToast('Diagnostic failed: Converted file signature is not WebP.');
      }
    } catch (err) {
      setTestStatus('failed');
      showToast(`Diagnostic Error: ${err.message}`);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (selectedFiles) => {
    const validFiles = selectedFiles.map((file) => {
      const isImage = file.type.startsWith('image/') || 
                      file.name.toLowerCase().endsWith('.heic') || 
                      file.name.toLowerCase().endsWith('.heif');
      if (!isImage) {
        showToast(`Skipped "${file.name}": Not an image.`);
        return null;
      }
      return {
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        originalFile: file,
        name: file.name,
        originalSize: file.size,
        previewUrl: URL.createObjectURL(file),
        status: 'pending', // 'pending', 'converting', 'success', 'error'
        error: null,
        convertedBlob: null,
        convertedUrl: null,
        convertedSize: 0,
        savings: 0,
      };
    }).filter(Boolean);

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const handleConvertFile = async (id) => {
    const fileItem = files.find((f) => f.id === id);
    if (!fileItem || fileItem.status === 'success') return;

    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'converting', error: null } : f))
    );

    try {
      const result = await convertToWebP(fileItem.originalFile, quality / 100);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'success',
                convertedBlob: result.blob,
                convertedUrl: result.url,
                convertedSize: result.newSize,
                savings: result.savings,
              }
            : f
        )
      );
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: 'error', error: err.message || 'Conversion failed.' } : f
        )
      );
    }
  };

  const handleConvertAll = async () => {
    const pending = files.filter((f) => f.status === 'pending' || f.status === 'error');
    if (pending.length === 0) return;
    
    for (const file of pending) {
      await handleConvertFile(file.id);
    }
  };

  const handleDownloadFile = (fileItem) => {
    if (!fileItem.convertedUrl) return;
    const link = document.createElement('a');
    link.href = fileItem.convertedUrl;
    
    // Change extension to .webp
    const baseName = fileItem.name.substring(0, fileItem.name.lastIndexOf('.')) || fileItem.name;
    link.download = `${baseName}.webp`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    const completed = files.filter((f) => f.status === 'success');
    if (completed.length === 0) return;
    
    completed.forEach((file) => {
      handleDownloadFile(file);
    });
  };

  const handleRemoveFile = (id) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) {
        if (target.previewUrl) URL.revokeObjectURL(target.previewUrl);
        if (target.convertedUrl) URL.revokeObjectURL(target.convertedUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <h1 className="admin-page-title">Image Converter to WebP</h1>
        <p className="admin-page-subtitle">
          Compress and convert PNG, JPEG, HEIC, and other assets locally inside your browser.
        </p>
      </header>

      <main className="admin-main-container flex flex-col gap-8">
        
        {/* Automated Diagnostics self-test container */}
        <section className="admin-card flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-outline-variant/20 pb-6">
          <div className="flex-1 space-y-1">
            <h2 className="admin-card-title flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">analytics</span>
              Self-Diagnostic Validator
            </h2>
            <p className="admin-card-subtitle">
              Verify WebP encoder functionality. Clicking "Run Diagnostics" creates a virtual mock image, encodes it, and verifies binary header magic bytes.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 flex-wrap">
            {testStatus && (
              <span className={`status-badge px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] ${
                testStatus === 'passed' ? 'test-badge-passed' :
                testStatus === 'failed' ? 'test-badge-failed' :
                'test-badge-running'
              }`}>
                <span className="material-symbols-outlined text-[14px]">
                  {testStatus === 'passed' ? 'check_circle' :
                   testStatus === 'failed' ? 'cancel' :
                   'progress_activity'}
                </span>
                Diagnostic: {testStatus.toUpperCase()}
              </span>
            )}

            <button
              onClick={runSelfTest}
              disabled={testStatus === 'running'}
              className="btn btn-secondary text-[11px] py-2 px-4"
            >
              Run Diagnostic Test
            </button>
          </div>
        </section>

        {testStatus === 'passed' && testDetails && (
          <div className="admin-card bg-secondary/5 border-secondary/20 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
            <div>
              <p className="font-semibold text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Encoder Signature Verified
              </p>
              <p className="text-on-surface-variant/80 mt-0.5">
                Standard PNG size: {formatSize(testDetails.originalSize)} ➔ Encoded WebP size: {formatSize(testDetails.newSize)} (Saved {testDetails.savings}%)
              </p>
            </div>
            <a
              href={testDetails.url}
              download="diagnostic-passed.webp"
              className="btn btn-outline py-1.5 px-3 text-[10px] flex items-center gap-1 shrink-0"
            >
              Download Test WebP
              <span className="material-symbols-outlined text-[12px]">download</span>
            </a>
          </div>
        )}

        {/* Converter Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Settings Control Block */}
          <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 h-fit flex flex-col gap-5">
            <div>
              <h2 className="admin-card-title">Converter Settings</h2>
              <p className="admin-card-subtitle">Adjust output encoding parameters.</p>
            </div>

            <div className="form-group">
              <div className="flex justify-between items-center mb-2">
                <label className="form-label mb-0" htmlFor="quality-slider">
                  WebP Compression Quality
                </label>
                <span className="font-mono text-xs font-bold text-primary">{quality}%</span>
              </div>
              <input
                id="quality-slider"
                type="range"
                min="10"
                max="100"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-1 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[9px] text-on-surface-variant/60 font-semibold mt-1">
                <span>MAX COMPRESSION</span>
                <span>BALANCED</span>
                <span>LOSSLESS (100%)</span>
              </div>
            </div>

            <div className="border-t border-outline-variant/20 pt-4 flex flex-col gap-3">
              <button
                onClick={handleConvertAll}
                disabled={files.filter((f) => f.status === 'pending' || f.status === 'error').length === 0}
                className="btn btn-primary w-full py-3"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                Convert Pending Images
              </button>

              <button
                onClick={handleDownloadAll}
                disabled={files.filter((f) => f.status === 'success').length === 0}
                className="btn btn-outline w-full py-3"
              >
                <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
                Download Converted WebPs
              </button>
            </div>
          </section>

          {/* Files List & Dropzone Container */}
          <section className="lg:col-span-2 admin-card flex flex-col gap-6">
            <div>
              <h2 className="admin-card-title">Image Assets Queue</h2>
              <p className="admin-card-subtitle">Drag and drop images below to queue them for WebP packaging.</p>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed border-outline-variant/50 hover:border-primary/50 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                dragActive ? 'dropzone-active' : 'bg-surface-container-lowest'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.heic,.heif"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="material-symbols-outlined text-4xl text-outline-variant">cloud_upload</span>
              <div>
                <p className="font-semibold text-on-surface text-[14px]">Drag and drop your images here</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Supports PNG, JPEG, WEBP, HEIC, GIF</p>
              </div>
              <button type="button" className="btn btn-outline py-1.5 px-3 text-[10px]">
                Browse Local Files
              </button>
            </div>

            {/* Files Queue List */}
            {files.length > 0 && (
              <div className="flex flex-col gap-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="converter-file-row flex flex-col sm:flex-row items-start sm:items-center justify-between border border-outline-variant/20 bg-surface-container-lowest rounded-xl p-3 gap-4"
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {/* Image Thumbnail preview */}
                      <div className="w-12 h-12 rounded-lg border border-outline-variant/20 overflow-hidden shrink-0 bg-surface-container-low">
                        <img
                          src={file.previewUrl}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="min-w-0 flex-1 sm:flex-initial">
                        <p className="font-bold text-on-surface text-[13px] truncate max-w-[200px]" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[10px] text-on-surface-variant/60 font-medium">
                          Size: {formatSize(file.originalSize)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      {/* Status and Savings Metrics */}
                      <div className="text-right">
                        {file.status === 'success' && (
                          <div>
                            <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded font-bold text-[9px] uppercase tracking-wider">
                              Saved {file.savings.toFixed(0)}%
                            </span>
                            <p className="text-[10px] text-on-surface-variant/75 mt-0.5 font-mono">
                              {formatSize(file.convertedSize)}
                            </p>
                          </div>
                        )}
                        {file.status === 'pending' && (
                          <span className="px-2 py-0.5 bg-outline-variant/25 text-on-surface-variant rounded font-bold text-[9px] uppercase tracking-wider">
                            Pending
                          </span>
                        )}
                        {file.status === 'converting' && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                            <span className="material-symbols-outlined animate-spin text-[10px]">progress_activity</span>
                            Converting
                          </span>
                        )}
                        {file.status === 'error' && (
                          <span
                            className="px-2 py-0.5 bg-error/15 text-error rounded font-bold text-[9px] uppercase tracking-wider cursor-help"
                            title={file.error}
                          >
                            Error
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        {file.status !== 'success' ? (
                          <button
                            type="button"
                            onClick={() => handleConvertFile(file.id)}
                            disabled={file.status === 'converting'}
                            className="btn btn-primary py-1.5 px-3 rounded-lg text-[10px]"
                          >
                            Convert
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(file)}
                            className="btn btn-outline py-1.5 px-3 rounded-lg text-[10px] flex items-center gap-0.5"
                          >
                            Download
                            <span className="material-symbols-outlined text-[12px]">download</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          className="w-7 h-7 rounded-full hover:bg-error/10 text-on-surface-variant hover:text-error flex items-center justify-center transition-colors"
                          title="Remove item"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
