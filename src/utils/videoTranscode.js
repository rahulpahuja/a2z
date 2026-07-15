const CORE_BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';

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
    })();
  }
  return ffmpegPromise;
}

// Re-encodes any uploaded video (HEVC .mov from iPhones included) to H.264/AAC
// MP4 so it plays back in every browser, not just Safari. Runs entirely
// client-side via ffmpeg.wasm (single-threaded core, no COOP/COEP needed) at
// upload time, so viewers never pay a transcoding cost.
export async function transcodeVideoToH264(file, onProgress) {
  const { fetchFile } = await import('@ffmpeg/util');
  const ffmpeg = await getFFmpeg();

  const progressHandler = ({ progress }) => {
    if (onProgress) onProgress(Math.min(1, Math.max(0, progress || 0)));
  };
  ffmpeg.on('progress', progressHandler);

  const stamp = Date.now();
  const inputExt = (file.name.match(/\.[^.]+$/) || ['.mov'])[0];
  const inputName = `input_${stamp}${inputExt}`;
  const outputName = `output_${stamp}.mp4`;

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    await ffmpeg.exec([
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
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const newName = file.name.replace(/\.[^.]+$/, '') + '.mp4';
    return new File([blob], newName, { type: 'video/mp4' });
  } finally {
    ffmpeg.off('progress', progressHandler);
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}
