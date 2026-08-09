// Downscales and re-encodes a photo in the browser before it's sent.
//
// A modern phone photo is 3-8MB; ten of those would blow past the serverless
// body limit and cost a great deal in image tokens for no accuracy gain.
// 1280px is enough to read a jar label, and lands around 150-250KB.

const DEFAULTS = { maxEdge: 1280, quality: 0.78 };

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`"${file.name}" could not be read as an image.`));
    };
    img.src = url;
  });
}

/** @returns {Promise<string>} base64 JPEG with no data: URI prefix. */
export async function imageToBase64Jpeg(file, options = {}) {
  const { maxEdge, quality } = { ...DEFAULTS, ...options };
  const { img, url } = await loadImage(file);
  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) throw new Error(`"${file.name}" has no readable dimensions.`);

    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return dataUrl.slice(dataUrl.indexOf(",") + 1);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function imagesToBase64Jpeg(files, { onProgress, ...options } = {}) {
  const out = [];
  for (let i = 0; i < files.length; i++) {
    out.push(await imageToBase64Jpeg(files[i], options));
    onProgress?.((i + 1) / files.length);
  }
  return out;
}
