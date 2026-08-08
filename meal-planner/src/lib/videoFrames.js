// Extracts still frames from a local video file entirely in the browser.
//
// Doing this client-side matters: the video never leaves the device, so a
// 40MB reel doesn't have to be uploaded, and the request that does go to the
// server stays well under the serverless body limit. Ten downscaled JPEGs are
// roughly 1MB, versus tens of megabytes for the source video.

const DEFAULTS = {
  count: 10,
  maxEdge: 1024, // large enough that on-screen recipe text stays legible
  quality: 0.72,
  // Reels almost always open and close on a title/handle card. Sampling
  // strictly inside the middle avoids spending frames on those.
  startFraction: 0.06,
  endFraction: 0.94,
};

function loadVideo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    const cleanup = () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
    };

    function onReady() {
      cleanup();
      if (!video.duration || !Number.isFinite(video.duration)) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read the video's duration."));
        return;
      }
      resolve({ video, url });
    }

    function onError() {
      cleanup();
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be decoded as a video."));
    }

    video.addEventListener("loadeddata", onReady);
    video.addEventListener("error", onError);
    video.src = url;
  });
}

function seekTo(video, time) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      clearTimeout(timer);
    };
    function onSeeked() {
      cleanup();
      resolve();
    }
    function onError() {
      cleanup();
      reject(new Error("Failed while seeking through the video."));
    }
    // Some browsers never fire `seeked` if the target lands past the last
    // decodable frame; don't let one bad timestamp hang the whole import.
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, 3000);

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = time;
  });
}

function frameSize(video, maxEdge) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) throw new Error("The video has no readable dimensions.");
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

/**
 * @returns {Promise<{frames: string[], durationSeconds: number}>}
 *   `frames` are base64 JPEG payloads with no data: URI prefix, ready to send
 *   as Claude image blocks.
 */
export async function extractFrames(file, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const { video, url } = await loadVideo(file);

  try {
    const { width, height } = frameSize(video, opts.maxEdge);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const duration = video.duration;
    const from = duration * opts.startFraction;
    const to = duration * opts.endFraction;
    const span = Math.max(0, to - from);

    const frames = [];
    for (let i = 0; i < opts.count; i++) {
      const t =
        opts.count === 1 ? from + span / 2 : from + (span * i) / (opts.count - 1);
      await seekTo(video, Math.min(t, Math.max(0, duration - 0.05)));
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", opts.quality);
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      if (base64) frames.push(base64);
      if (options.onProgress) options.onProgress((i + 1) / opts.count);
    }

    if (frames.length === 0) {
      throw new Error("No frames could be read from that video.");
    }
    return { frames, durationSeconds: duration };
  } finally {
    video.src = "";
    URL.revokeObjectURL(url);
  }
}
