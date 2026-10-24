import { compressImageFile } from '../utils/imageCompression.js';
import { convertHeicFileToPng, isHeicFile } from '../utils/heic.js';
import { isGifFile } from '../utils/gif.js';
import { uploadImageToExternalServer } from './imageUpload.js';

const MAX_BYTES = 15 * 1024 * 1024;

// Uploads an image chosen in the blog editor and resolves its public URL. Photos are converted from HEIC and
// shrunk first; animated GIFs go up untouched so they keep their animation.
export async function uploadBlogImage(file) {
  if (!file || !String(file.type || '').startsWith('image/') && !isHeicFile(file)) throw new Error('Choose an image file.');
  if (file.size > MAX_BYTES) throw new Error('That image is larger than 15 MB. Please choose a smaller one.');
  let source = file;
  if (isHeicFile(source)) source = await convertHeicFileToPng(source);
  const stamp = `blog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  if (isGifFile(source)) return uploadImageToExternalServer(source, `${stamp}.gif`);
  const { file: compressed, extension } = await compressImageFile(source);
  return uploadImageToExternalServer(compressed, `${stamp}${extension}`);
}
