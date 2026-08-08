import { extractFrames } from "./videoFrames.js";
import { hydrateRecipe } from "./recipeUtils.js";
import { MOCK_RECIPES } from "./mockRecipePool.js";

const ENDPOINT = "/api/extract-recipe";

export class VideoImportError extends Error {
  constructor(message, { code, retryable = true } = {}) {
    super(message);
    this.name = "VideoImportError";
    this.code = code;
    this.retryable = retryable;
  }
}

// Stands in for the real endpoint during local `npm run dev`, where no
// serverless function is running. It returns a real recipe from the pool so
// the whole review-and-save flow can be exercised without an API key — it
// does not look at the video.
async function mockExtract() {
  await new Promise((r) => setTimeout(r, 900));
  const pick = MOCK_RECIPES[Math.floor(Math.random() * MOCK_RECIPES.length)];
  return {
    ...JSON.parse(JSON.stringify(pick)),
    confidence: "low",
    notes:
      "Demo mode: no extraction service is configured, so this is a sample recipe rather than anything read from your video.",
    demo: true,
  };
}

/**
 * Video file -> reviewed-ready Recipe.
 * Never writes anything; the caller decides whether to keep the result.
 */
export async function recipeFromVideo(file, { caption = "", onStage } = {}) {
  if (!file) throw new VideoImportError("Choose a video first.", { code: "no_file" });

  onStage?.({ stage: "reading", progress: 0 });

  let frames;
  try {
    const result = await extractFrames(file, {
      onProgress: (p) => onStage?.({ stage: "reading", progress: p }),
    });
    frames = result.frames;
  } catch (err) {
    throw new VideoImportError(
      err.message || "That video could not be read.",
      { code: "decode_failed", retryable: false },
    );
  }

  onStage?.({ stage: "extracting", progress: 1 });

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ frames, caption }),
    });
  } catch {
    throw new VideoImportError(
      "Couldn't reach the extraction service. Check your connection.",
      { code: "network" },
    );
  }

  // No function deployed — either a plain 404, or (with an SPA fallback in
  // front, which both `vite preview` and a static Netlify deploy have) a 200
  // serving index.html. Detect both by content type, or the HTML gets handed
  // to JSON.parse and surfaces as a nonsense error.
  const isJson = (response.headers.get("content-type") || "").includes(
    "application/json",
  );
  if (response.status === 404 || !isJson) {
    const data = await mockExtract();
    return { recipe: hydrateRecipe(data), meta: pickMeta(data) };
  }

  if (!response.ok) {
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      /* non-JSON error body; fall through to the default message */
    }
    throw new VideoImportError(
      payload.error || "Recipe extraction failed. Try again.",
      {
        code: payload.code,
        // Retrying an unconfigured server or an undecodable video just fails
        // again; only offer retry where it could actually help.
        retryable: !["not_configured", "bad_key", "refused"].includes(payload.code),
      },
    );
  }

  const { recipe } = await response.json();
  return { recipe: hydrateRecipe(recipe), meta: pickMeta(recipe) };
}

function pickMeta(data) {
  return {
    confidence: data?.confidence || "medium",
    notes: data?.notes || "",
    demo: Boolean(data?.demo),
  };
}
