// Shared between the serverless functions. Lives outside netlify/functions so
// Netlify never mistakes it for a deployable function; esbuild inlines it.

export const GROCERY_CATEGORIES = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Pantry",
  "Bakery",
  "Frozen",
  "Other",
];

export const RECIPE_PROPERTIES = {
  title: { type: "string", description: "The dish name." },
  description: { type: "string", description: "One sentence describing the dish." },
  cuisine: {
    type: "string",
    description: "Cuisine of the dish. Empty string if genuinely unclear.",
  },
  dietary_tags: {
    type: "array",
    items: { type: "string" },
    description:
      "0-3 tags from: Vegetarian, Vegan, Gluten-Free, Dairy-Free, Pescatarian. Only include a tag if every ingredient supports it.",
  },
  time_minutes: {
    type: "integer",
    description: "Total time in minutes. Use 0 if it cannot be determined.",
  },
  servings: {
    type: "integer",
    description: "Number of servings. Use 2 if it cannot be determined.",
  },
  ingredients: {
    type: "array",
    items: { type: "string" },
    description: "One ingredient per entry, each including its quantity.",
  },
  steps: {
    type: "array",
    items: { type: "string" },
    description: "Method steps in order, one action per entry, imperative.",
  },
};

export const RECIPE_REQUIRED = Object.keys(RECIPE_PROPERTIES);

/** Schema for reading a recipe out of a video or photo. */
export const EXTRACTED_RECIPE_SCHEMA = {
  type: "object",
  properties: {
    ...RECIPE_PROPERTIES,
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "How well-supported the extraction is by the source material.",
    },
    notes: {
      type: "string",
      description:
        "Anything the user should check — guessed quantities, unreadable text, inferred steps. Empty string if nothing needs flagging.",
    },
  },
  required: [...RECIPE_REQUIRED, "confidence", "notes"],
  additionalProperties: false,
};

/** Schema for identifying food visible in a fridge/pantry photo. */
export const PANTRY_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      description: "Every distinct food item you can actually see.",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Short common name, e.g. 'cheddar', 'red onions', 'oat milk'. Lowercase unless a proper noun.",
          },
          category: { type: "string", enum: GROCERY_CATEGORIES },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
            description:
              "high = clearly identifiable; medium = probable from shape/packaging; low = a guess.",
          },
        },
        required: ["name", "category", "confidence"],
        additionalProperties: false,
      },
    },
    notes: {
      type: "string",
      description:
        "Anything obscured, unreadable, or ambiguous. Empty string if nothing needs flagging.",
    },
  },
  required: ["items", "notes"],
  additionalProperties: false,
};

/** Schema for a recipe built from a known set of ingredients. */
export const PANTRY_RECIPE_SCHEMA = {
  type: "object",
  properties: {
    ...RECIPE_PROPERTIES,
    missing: {
      type: "array",
      items: { type: "string" },
      description:
        "Ingredients this recipe needs that were NOT in the provided list. Staples like salt, pepper, oil and water may be assumed and left out of this list.",
    },
    notes: {
      type: "string",
      description:
        "A sentence on how well this fits what they have. Empty string if it fits cleanly.",
    },
  },
  required: [...RECIPE_REQUIRED, "missing", "notes"],
  additionalProperties: false,
};

export function jsonError(status, message, code) {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Shared guard: wrong method, missing key, unreadable body. */
export async function readRequest(req) {
  if (req.method !== "POST") {
    return { error: jsonError(405, "Use POST.", "method_not_allowed") };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      error: jsonError(
        503,
        "The server has no ANTHROPIC_API_KEY configured, so this feature is unavailable.",
        "not_configured",
      ),
    };
  }
  try {
    return { body: await req.json() };
  } catch {
    return { error: jsonError(400, "Request body was not valid JSON.", "bad_body") };
  }
}

/** Shared mapping of SDK errors onto user-facing responses. */
export function mapUpstreamError(err, label) {
  if (err?.status === 401) {
    return jsonError(503, "The server's API key was rejected.", "bad_key");
  }
  if (err?.status === 429) {
    return jsonError(429, "Rate limited. Wait a moment and try again.", "rate_limited");
  }
  console.error(`${label} failed`, err);
  return jsonError(502, "That didn't work. Try again.", "upstream_error");
}

/** Shared handling of a structured-output response. */
export function readStructured(message, label) {
  if (message.stop_reason === "refusal") {
    return { error: jsonError(422, "That request couldn't be processed.", "refused") };
  }
  if (message.stop_reason === "max_tokens") {
    return { error: jsonError(502, `The ${label} came back incomplete. Try again.`, "truncated") };
  }
  const text = message.content.find((b) => b.type === "text")?.text;
  if (!text) return { error: jsonError(502, `No ${label} was returned.`, "empty_response") };
  try {
    return { data: JSON.parse(text) };
  } catch {
    return { error: jsonError(502, `The ${label} could not be read.`, "unparseable") };
  }
}
