// Custom lossless image container: raw RGBA pixels, per-row delta-filtered
// (like PNG's "Sub" filter), then DEFLATE-compressed via the browser's
// native CompressionStream. Fully reversible — no pixel data is discarded.
//
// Layout: "A2IC" magic (4) | version (1) | channels (1) | width u32LE (4) |
// height u32LE (4) | deflate-raw compressed filtered pixel bytes.

const MAGIC = [0x41, 0x32, 0x49, 0x43]; // "A2IC"
const VERSION = 1;
const HEADER_SIZE = 4 + 1 + 1 + 4 + 4;
export const COMPRESSED_EXTENSION = '.a2ic';

function assertCompressionSupported() {
  if (typeof CompressionStream === 'undefined' || typeof DecompressionStream === 'undefined') {
    throw new Error('This browser does not support image compression. Please update your browser.');
  }
}

async function deflate(bytes) {
  const stream = new CompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buffer = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buffer);
}

async function inflate(bytes) {
  const stream = new DecompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buffer = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buffer);
}

// Per row, pick whichever of {None, Sub-left} filter minimizes byte
// magnitude, which makes the data compress noticeably better than raw
// pixels while staying perfectly reversible.
function filterPixels(pixels, width, height, channels) {
  const rowBytes = width * channels;
  const out = new Uint8Array(height * (rowBytes + 1));
  const subRow = new Uint8Array(rowBytes);
  let outOffset = 0;

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowBytes;
    let noneCost = 0;
    let subCost = 0;

    for (let x = 0; x < rowBytes; x++) {
      const value = pixels[rowStart + x];
      const left = x >= channels ? pixels[rowStart + x - channels] : 0;
      const sub = (value - left) & 0xff;
      subRow[x] = sub;
      noneCost += value < 128 ? value : 256 - value;
      subCost += sub < 128 ? sub : 256 - sub;
    }

    if (subCost < noneCost) {
      out[outOffset++] = 1;
      out.set(subRow, outOffset);
    } else {
      out[outOffset++] = 0;
      out.set(pixels.subarray(rowStart, rowStart + rowBytes), outOffset);
    }
    outOffset += rowBytes;
  }

  return out;
}

function unfilterPixels(bytes, width, height, channels) {
  const rowBytes = width * channels;
  const pixels = new Uint8ClampedArray(width * height * channels);
  let offset = 0;

  for (let y = 0; y < height; y++) {
    const filterType = bytes[offset++];
    const rowStart = y * rowBytes;
    if (filterType === 0) {
      for (let x = 0; x < rowBytes; x++) {
        pixels[rowStart + x] = bytes[offset + x];
      }
    } else {
      for (let x = 0; x < rowBytes; x++) {
        const left = x >= channels ? pixels[rowStart + x - channels] : 0;
        pixels[rowStart + x] = (bytes[offset + x] + left) & 0xff;
      }
    }
    offset += rowBytes;
  }

  return pixels;
}

function toA2icName(originalName) {
  const base = originalName.replace(/\.[^./]+$/, '') || 'image';
  return `${base}${COMPRESSED_EXTENSION}`;
}

/**
 * Losslessly compresses an image File into our custom .a2ic container.
 * Returns the compressed File (ready to upload) plus a cheap local preview
 * blob: URL rendered straight from canvas, so the caller never needs to
 * run the decompressor just to show what was picked.
 */
export async function compressImageFile(file) {
  assertCompressionSupported();

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const channels = 4;

  const filtered = filterPixels(data, width, height, channels);
  const compressedBody = await deflate(filtered);

  const header = new Uint8Array(HEADER_SIZE);
  header.set(MAGIC, 0);
  header[4] = VERSION;
  header[5] = channels;
  new DataView(header.buffer).setUint32(6, width, true);
  new DataView(header.buffer).setUint32(10, height, true);

  const bytes = new Uint8Array(header.length + compressedBody.length);
  bytes.set(header, 0);
  bytes.set(compressedBody, header.length);

  const compressedFile = new File([bytes], toA2icName(file.name), { type: 'application/octet-stream' });

  const previewBlob = await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Preview render failed'))), 'image/png');
  });

  return {
    file: compressedFile,
    previewUrl: URL.createObjectURL(previewBlob),
    width,
    height,
    originalSize: file.size,
    compressedSize: compressedFile.size,
  };
}

/** True if the given URL/filename points at an .a2ic compressed image. */
export function isCompressedImageUrl(url) {
  if (!url) return false;
  return /\.a2ic($|[?#])/i.test(url);
}

/** Decompresses raw .a2ic bytes back into a viewable image/png Blob. */
export async function decompressImageBytes(arrayBuffer) {
  assertCompressionSupported();

  const bytes = new Uint8Array(arrayBuffer);
  const hasMagic = MAGIC.every((byte, i) => bytes[i] === byte);
  if (!hasMagic) {
    throw new Error('Not a valid .a2ic compressed image');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const channels = bytes[5];
  const width = view.getUint32(6, true);
  const height = view.getUint32(10, true);

  const filtered = await inflate(bytes.subarray(HEADER_SIZE));
  const pixels = unfilterPixels(filtered, width, height, channels);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(new ImageData(pixels, width, height), 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Decompressed render failed'))), 'image/png');
  });
}

/** Fetches (downloads) and decompresses an .a2ic URL, returning a blob: URL for <img src>. */
export async function decompressImageUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download compressed image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const blob = await decompressImageBytes(arrayBuffer);
  return URL.createObjectURL(blob);
}
