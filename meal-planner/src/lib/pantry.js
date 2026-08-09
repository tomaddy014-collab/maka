import { imagesToBase64Jpeg } from "./images.js";
import { hydrateRecipe } from "./recipeUtils.js";
import { MOCK_RECIPES } from "./mockRecipePool.js";
import { store } from "./storage.js";

const IDENTIFY_ENDPOINT = "/api/identify-ingredients";
const RECIPE_ENDPOINT = "/api/recipe-from-pantry";

export class PantryError extends Error {
  constructor(message, { code, retryable = true } = {}) {
    super(message);
    this.name = "PantryError";
    this.code = code;
    this.retryable = retryable;
  }
}

// The identified list survives reloads, so one set of photos can feed several
// meals across the week instead of being re-shot each time.
export function loadPantry() {
  const saved = store.get("pantry", null);
  if (!saved || !Array.isArray(saved.items)) return null;
  return saved;
}

export function savePantry(items) {
  const next = { items, savedAt: new Date().toISOString() };
  store.set("pantry", next);
  return next;
}

export function clearPantry() {
  store.remove("pantry");
}

// A response from an SPA fallback (200 + index.html) means no function is
// deployed — same detection as the video import.
function isMissingFunction(response) {
  const isJson = (response.headers.get("content-type") || "").includes("application/json");
  return response.status === 404 || !isJson;
}

async function failFrom(response) {
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    /* non-JSON body; fall through to the default message */
  }
  return new PantryError(payload.error || "That didn't work. Try again.", {
    code: payload.code,
    retryable: !["not_configured", "bad_key", "refused"].includes(payload.code),
  });
}

// ---- demo fallbacks -------------------------------------------------------

const DEMO_ITEMS = [
  { name: "eggs", category: "Dairy & Eggs", confidence: "high" },
  { name: "cheddar", category: "Dairy & Eggs", confidence: "high" },
  { name: "milk", category: "Dairy & Eggs", confidence: "high" },
  { name: "onions", category: "Produce", confidence: "high" },
  { name: "garlic", category: "Produce", confidence: "high" },
  { name: "tomatoes", category: "Produce", confidence: "medium" },
  { name: "spinach", category: "Produce", confidence: "medium" },
  { name: "spaghetti", category: "Pantry", confidence: "high" },
  { name: "olive oil", category: "Pantry", confidence: "high" },
  { name: "butter", category: "Dairy & Eggs", confidence: "high" },
];

/**
 * Demo stand-in for recipe generation: scores the real recipe pool by how much
 * it overlaps the pantry list. Not as good as the model, but it genuinely
 * responds to what you have rather than returning something at random.
 */
function demoRecipeFor(items, slot, avoid) {
  const have = items.map((s) => s.toLowerCase());
  const overlaps = (ing) => have.some((h) => ing.toLowerCase().includes(h) || h.includes(ing.toLowerCase().split(",")[0].trim()));

  const scored = MOCK_RECIPES.filter((r) => r.slot === slot && !avoid.includes(r.title))
    .map((r) => {
      const matched = r.ingredients.filter(overlaps);
      return { recipe: r, score: matched.length / r.ingredients.length, matched: matched.length };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best) return null;
  const missing = best.recipe.ingredients.filter((i) => !overlaps(i));
  return {
    ...JSON.parse(JSON.stringify(best.recipe)),
    missing,
    notes: `Demo mode: matched against a built-in recipe list rather than generated for your kitchen. It uses ${best.matched} of your ${items.length} items.`,
    demo: true,
  };
}

// ---- stage 1: photos -> ingredients ---------------------------------------

export async function identifyIngredients(files, { onStage } = {}) {
  if (!files?.length) throw new PantryError("Add a photo first.", { code: "no_files" });

  onStage?.({ stage: "encoding", progress: 0 });
  let images;
  try {
    images = await imagesToBase64Jpeg(files, {
      onProgress: (p) => onStage?.({ stage: "encoding", progress: p }),
    });
  } catch (err) {
    throw new PantryError(err.message || "Those photos could not be read.", {
      code: "encode_failed",
      retryable: false,
    });
  }

  onStage?.({ stage: "identifying", progress: 1 });

  let response;
  try {
    response = await fetch(IDENTIFY_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ images }),
    });
  } catch {
    throw new PantryError("Couldn't reach the server. Check your connection.", {
      code: "network",
    });
  }

  if (isMissingFunction(response)) {
    await new Promise((r) => setTimeout(r, 700));
    return { items: DEMO_ITEMS, notes: "", demo: true };
  }
  if (!response.ok) throw await failFrom(response);

  const data = await response.json();
  return { items: data.items || [], notes: data.notes || "", demo: false };
}

// ---- stage 2: ingredients -> recipe ---------------------------------------

export async function recipeFromPantry(items, { slot, dietary, time, avoid = [] } = {}) {
  if (!items?.length) throw new PantryError("Your kitchen list is empty.", { code: "empty" });

  let response;
  try {
    response = await fetch(RECIPE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items, slot, dietary, time, avoid }),
    });
  } catch {
    throw new PantryError("Couldn't reach the server. Check your connection.", {
      code: "network",
    });
  }

  if (isMissingFunction(response)) {
    await new Promise((r) => setTimeout(r, 700));
    const demo = demoRecipeFor(items, slot, avoid);
    if (!demo) {
      throw new PantryError(
        `No demo ${slot.toLowerCase()} recipe is available. Deploy the server to generate real ones.`,
        { code: "no_demo_match", retryable: false },
      );
    }
    return {
      recipe: hydrateRecipe(demo),
      meta: { missing: demo.missing, notes: demo.notes, demo: true },
    };
  }
  if (!response.ok) throw await failFrom(response);

  const { recipe } = await response.json();
  return {
    recipe: hydrateRecipe(recipe),
    meta: {
      missing: Array.isArray(recipe.missing) ? recipe.missing : [],
      notes: recipe.notes || "",
      demo: false,
    },
  };
}
