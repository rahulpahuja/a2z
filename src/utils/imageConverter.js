import { isHeicFile, convertHeicFileToPng } from './heic.js';

/**
 * Converts any browser-readable image file or HEIC to a WebP blob.
 * 
 * @param {File | Blob} file The input image file
 * @param {number} quality Compression quality between 0 and 1
 * @returns {Promise<{blob: Blob, url: string, originalSize: number, newSize: number, savings: number}>}
 */
export async function convertToWebP(file, quality = 0.8) {
  let workingBlob = file;

  if (isHeicFile(file)) {
    try {
      workingBlob = await convertHeicFileToPng(file);
    } catch (error) {
      throw new Error(`HEIC conversion failed: ${error.message}`);
    }
  }

  // Load into HTML Image
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Draw on Canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get 2D context for canvas.'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        // Output to WebP blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('WebP blob generation failed.'));
            return;
          }
          
          const url = URL.createObjectURL(blob);
          const savings = file.size > 0 ? ((file.size - blob.size) / file.size) * 100 : 0;
          
          resolve({
            blob,
            url,
            originalSize: file.size,
            newSize: blob.size,
            savings: Math.max(0, savings),
          });
        }, 'image/webp', quality);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image data. The file may be corrupt or an unsupported format.'));
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = () => {
      reject(new Error('FileReader read error.'));
    };
    
    reader.readAsDataURL(workingBlob);
  });
}

/**
 * Validates whether a given Blob is a valid WebP image by inspecting its file signature (magic bytes).
 * A valid WebP file starts with "RIFF" (bytes 0-3) and has "WEBP" at bytes 8-11.
 * 
 * @param {Blob} blob 
 * @returns {Promise<boolean>}
 */
export async function validateWebPSignature(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const arr = new Uint8Array(reader.result);
      if (arr.length < 12) {
        resolve(false);
        return;
      }
      
      // RIFF check
      const riff = String.fromCharCode(arr[0], arr[1], arr[2], arr[3]);
      // WEBP check
      const webp = String.fromCharCode(arr[8], arr[9], arr[10], arr[11]);
      
      resolve(riff === 'RIFF' && webp === 'WEBP');
    };
    reader.onerror = () => resolve(false);
    
    reader.readAsArrayBuffer(blob.slice(0, 12));
  });
}
