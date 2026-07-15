import { useState, useRef } from 'react';
import { useToast } from '../../context/ToastContext.jsx';

export default function AdminUploadTestPage() {
  const { showToast } = useToast();
  
  // Pre-populate with env variable or empty
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_IMAGE_UPLOAD_API_URL || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadResult(null); // Clear previous test result
    } else {
      showToast('Please select a valid image file.');
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

  const selectFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('No file selected to upload.');
      return;
    }

    if (!apiUrl.trim()) {
      showToast('Please enter your Cloudflare Worker Upload API URL.');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Clean trailing slash from API url if present
      const cleanUrl = apiUrl.replace(/\/$/, '');
      const response = await fetch(`${cleanUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      setUploadResult({
        success: true,
        url: data.url,
        key: data.key,
        timestamp: new Date().toLocaleTimeString(),
      });
      showToast('Image uploaded successfully to R2!');
    } catch (err) {
      console.error(err);
      setUploadResult({
        success: false,
        error: err.message || 'Unknown error occurred during upload',
      });
      showToast('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-6">
        <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-on-surface">R2 Upload Test</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Verify and troubleshoot your Cloudflare R2 Upload Worker configuration in real-time.
        </p>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Configuration & File Pickers (7 columns) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30">
            <h2 className="font-title-sm text-title-sm text-on-surface mb-4">1. Uploader Configuration</h2>
            
            <div className="flex flex-col gap-2">
              <label className="block font-label-caps text-label-caps text-on-surface-variant" htmlFor="api-endpoint">
                Worker Endpoint URL (Excludes "/upload")
              </label>
              <input
                id="api-endpoint"
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="e.g. https://r2-image-uploader.yourname.workers.dev"
                className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-0 rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface transition-colors"
              />
              <p className="font-body-sm text-body-sm text-on-surface-variant/70">
                You can configure this globally by updating <code className="bg-surface-container px-1 py-0.5 rounded font-mono text-[12px]">VITE_IMAGE_UPLOAD_API_URL</code> in your <code className="bg-surface-container px-1 py-0.5 rounded font-mono text-[12px]">.env</code> file.
              </p>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 flex-1 flex flex-col">
            <h2 className="font-title-sm text-title-sm text-on-surface mb-4">2. Select Image File</h2>
            
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`flex-1 min-h-[220px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 transition-all cursor-pointer ${
                dragActive 
                  ? 'border-primary bg-primary/5 scale-[0.99]' 
                  : 'border-outline-variant hover:border-primary/50 bg-surface-container-lowest'
              }`}
              onClick={selectFileClick}
            >
              <input
                ref={fileInputRef}
                id="file-upload-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="material-symbols-outlined text-4xl text-outline mb-4">cloud_upload</span>
              <p className="font-body-lg text-body-lg text-on-surface font-semibold text-center mb-1">
                Drag &amp; drop your image here
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
                Or click to browse from files (JPG, PNG, WEBP)
              </p>
            </div>
            
            {selectedFile && (
              <div className="flex items-center gap-4 mt-6 bg-surface-container-high rounded-xl p-4 border border-outline-variant/35">
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-surface-container">
                  <img src={previewUrl} className="w-full h-full object-cover" alt="Local thumbnail" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body-lg text-body-lg text-on-surface font-semibold truncate">{selectedFile.name}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={handleReset}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-error hover:bg-error/10 transition-colors"
                  aria-label="Remove File"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !apiUrl}
              className="mt-6 w-full bg-primary text-on-primary font-label-caps text-label-caps py-4 rounded-lg uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(172,36,113,0.1)] flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-t-transparent border-on-primary rounded-full"></span>
                  Uploading to R2…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">upload</span>
                  Test Upload
                </>
              )}
            </button>
          </div>
        </section>

        {/* Right: Results Console (5 columns) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 flex-1 flex flex-col h-full">
            <h2 className="font-title-sm text-title-sm text-on-surface mb-4">3. Test Output Log</h2>
            
            {!uploadResult && !uploading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-on-surface-variant/60">
                <span className="material-symbols-outlined text-4xl mb-3">terminal</span>
                <p className="font-body-sm text-body-sm">Console idle. Select a file and hit 'Test Upload' to run diagnostic.</p>
              </div>
            )}

            {uploading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <span className="animate-spin inline-block w-8 h-8 border-4 border-t-transparent border-primary rounded-full mb-4"></span>
                <p className="font-body-lg text-body-lg text-on-surface font-semibold">Uploading File...</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Connecting to {apiUrl}...</p>
              </div>
            )}

            {uploadResult && (
              <div className="flex-grow flex flex-col gap-5">
                {uploadResult.success ? (
                  <>
                    <div className="bg-green-500/10 border border-green-500/35 rounded-xl p-4 flex gap-3 items-center">
                      <span className="material-symbols-outlined text-green-600">check_circle</span>
                      <div>
                        <p className="font-body-lg text-body-lg text-green-800 font-semibold">Success (200 OK)</p>
                        <p className="font-body-sm text-body-sm text-green-700">Uploaded at {uploadResult.timestamp}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="block font-label-caps text-label-caps text-on-surface-variant">Storage Key / File Name</span>
                      <code className="bg-surface-container-lowest border border-outline-variant/60 rounded-lg p-3 font-mono text-[12px] break-all block text-on-surface">
                        {uploadResult.key}
                      </code>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="block font-label-caps text-label-caps text-on-surface-variant">R2 Public URL Address</span>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={uploadResult.url}
                          className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 font-mono text-[11px] text-on-surface truncate"
                        />
                        <a
                          href={uploadResult.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-label-caps text-[11px] rounded-lg flex items-center justify-center"
                        >
                          Open
                        </a>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-2">
                      <span className="block font-label-caps text-label-caps text-on-surface-variant">Live Image Render (From R2)</span>
                      <div className="flex-grow min-h-[160px] aspect-[4/3] rounded-xl overflow-hidden border border-outline-variant/40 bg-surface-container-lowest relative group">
                        <img 
                          src={uploadResult.url} 
                          className="w-full h-full object-contain" 
                          alt="Render from Cloudflare R2" 
                          onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = 'https://placehold.co/400x300?text=Render+Failed';
                            showToast("Could not load image from public URL. Check public access settings.");
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white font-body-sm text-[12px] bg-black/60 px-3 py-1.5 rounded-full">R2 Live Load</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-error/10 border border-error/35 rounded-xl p-4 flex gap-3 items-center">
                      <span className="material-symbols-outlined text-error">error</span>
                      <div>
                        <p className="font-body-lg text-body-lg text-error font-semibold">Upload Failed</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Check CORS or secret configurations.</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="block font-label-caps text-label-caps text-on-surface-variant">Diagnostic Console</span>
                      <textarea
                        readOnly
                        rows={6}
                        value={uploadResult.error}
                        className="w-full bg-surface-container-lowest border border-error/20 text-error font-mono text-[12px] p-3 rounded-lg focus:ring-0 outline-none"
                      />
                    </div>
                    
                    <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/40">
                      <h4 className="font-title-sm text-[14px] text-on-surface mb-2 font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-primary">info</span>
                        Common issues:
                      </h4>
                      <ul className="list-disc pl-5 font-body-sm text-body-sm text-on-surface-variant space-y-1">
                        <li><strong>CORS policy:</strong> Worker must support preflight OPTIONS request.</li>
                        <li><strong>Missing Secrets:</strong> Wrangler secrets might be unset or typoed.</li>
                        <li><strong>Account/Bucket typos:</strong> Validate Account ID in <code className="bg-surface-container px-1 rounded text-[11px]">wrangler.toml</code>.</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
