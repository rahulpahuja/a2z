const CORE_BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
const MAX_INPUT_BYTES = 300 * 1024 * 1024; // 300MB — larger clips can exceed the wasm heap and hang

let ffmpegPromise = null;

async function getFFmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/util'),
      ]);
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      return ffmpeg;
    })().catch((err) => {
      // Don't cache a failed load (e.g. transient network hiccup fetching the
      // core from the CDN) — let the next attempt retry from scratch.
      ffmpegPromise = null;
      throw err;
    });
  }
  return ffmpegPromise;
}

// Re-encodes any uploaded video (HEVC .mov from iPhones included) to H.264/AAC
// MP4 so it plays back in every browser, not just Safari. Runs entirely
// client-side via ffmpeg.wasm (single-threaded core, no COOP/COEP needed) at
// upload time, so viewers never pay a transcoding cost.
export async function transcodeVideoToH264(file, onProgress) {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(
      `This video is ${(file.size / (1024 * 1024)).toFixed(0)}MB — please trim or compress it below ${MAX_INPUT_BYTES / (1024 * 1024)}MB before uploading.`
    );
  }

  const { fetchFile } = await import('@ffmpeg/util');
  const ffmpeg = await getFFmpeg();

  const progressHandler = ({ progress }) => {
    if (onProgress) onProgress(Math.min(1, Math.max(0, progress || 0)));
  };
  const logLines = [];
  const logHandler = ({ message }) => {
    logLines.push(message);
    if (logLines.length > 40) logLines.shift();
  };
  ffmpeg.on('progress', progressHandler);
  ffmpeg.on('log', logHandler);

  const stamp = Date.now();
  const inputExt = (file.name.match(/\.[^.]+$/) || ['.mov'])[0];
  const inputName = `input_${stamp}${inputExt}`;
  const outputName = `output_${stamp}.mp4`;

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    const exitCode = await ffmpeg.exec([
      '-i', inputName,
      '-vf', "scale='min(1280,iw)':-2",
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '28',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputName,
    ]);
    // ffmpeg.exec() resolves with a non-zero code on failure instead of
    // throwing — ignoring it silently produces a missing/corrupt output file
    // that then fails (or worse, "uploads" something that never plays).
    if (exitCode !== 0) {
      const detail = logLines.slice(-5).join(' ').trim();
      throw new Error(`Video conversion failed${detail ? `: ${detail}` : ''}.`);
    }

    const data = await ffmpeg.readFile(outputName);
    if (!data || data.byteLength === 0) {
      throw new Error('Video conversion produced an empty file.');
    }
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const newName = file.name.replace(/\.[^.]+$/, '') + '.mp4';
    return new File([blob], newName, { type: 'video/mp4' });
  } finally {
    ffmpeg.off('progress', progressHandler);
    ffmpeg.off('log', logHandler);
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}
