import Anthropic from "@anthropic-ai/sdk";

// Turns video frames (and the post's caption, if the user pasted one) into a
// structured recipe.
//
// This runs server-side for one reason: ANTHROPIC_API_KEY must never reach the
// browser. Anything in the client bundle is readable by anyone who opens
// devtools, so the key lives here and the browser only ever talks to this
// endpoint.

// Claude validates its own output against this schema, so the response is
// guaranteed to parse and to have these fields — no fence-stripping, no
// JSON.parse guesswork, no retry-on-malformed loop.
const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "The dish name." },
    description: {
      type: "string",
      description: "One sentence describing the dish.",
    },
    cuisine: {
      type: "string",
      description:
        "Cuisine of the dish, e.g. Italian, Thai, Mexican. Empty string if genuinely unclear.",
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
      description:
        "One ingredient per entry, each including its quantity where the video or caption states one.",
    },
    steps: {
      type: "array",
      items: { type: "string" },
      description: "Method steps in order, one action per entry, imperative.",
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description:
        "How well-supported the extraction is by the source material.",
    },
    notes: {
      type: "string",
      description:
        "Anything the user should check — guessed quantities, unreadable text, steps inferred rather than shown. Empty string if nothing needs flagging.",
    },
  },
  required: [
    "title",
    "description",
    "cuisine",
    "dietary_tags",
    "time_minutes",
    "servings",
    "ingredients",
    "steps",
    "confidence",
    "notes",
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You reconstruct a cookable recipe from a short social-media cooking video.

You are given still frames sampled evenly through the video, and often the post's caption. The caption, when present, is the most reliable source — creators usually write the full recipe there. Use the frames to fill gaps, read on-screen text overlays, and confirm the order of steps.

Rules:
- Report what the source actually shows. Do not invent quantities that are never stated or shown; write the ingredient without a quantity instead, and say so in "notes".
- Prefer the caption over your reading of a frame when they disagree.
- Only apply a dietary tag if every ingredient in your list supports it. A dish with fish is not Vegetarian; a dish with soy sauce is not Gluten-Free.
- Steps describe cooking actions, not filming. Never write "shows the pan" or "cuts to".
- If the video is not a cooking video at all, still fill the schema, set confidence to "low", and say so in "notes".
- Set confidence honestly: "high" only when a caption or clear on-screen text gave you the full ingredient list and method.`;

function bad(status, message, code) {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async (req) => {
  if (req.method !== "POST") return bad(405, "Use POST.", "method_not_allowed");

  if (!process.env.ANTHROPIC_API_KEY) {
    return bad(
      503,
      "The server has no ANTHROPIC_API_KEY configured, so video import is unavailable.",
      "not_configured",
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return bad(400, "Request body was not valid JSON.", "bad_body");
  }

  const frames = Array.isArray(body.frames) ? body.frames.slice(0, 16) : [];
  const caption = typeof body.caption === "string" ? body.caption.trim() : "";

  if (frames.length === 0 && !caption) {
    return bad(
      400,
      "Send at least one frame or a caption to extract from.",
      "empty_input",
    );
  }

  const content = frames.map((data) => ({
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data },
  }));

  content.push({
    type: "text",
    text: caption
      ? `These ${frames.length} frames are sampled in order from a cooking video. The post's caption follows — treat it as the primary source.\n\n<caption>\n${caption.slice(0, 8000)}\n</caption>\n\nReconstruct the recipe.`
      : `These ${frames.length} frames are sampled in order from a cooking video. No caption was provided, so work from the frames alone — read any on-screen text carefully. Reconstruct the recipe.`,
  });

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      // This is structured extraction, not deep reasoning. Low effort keeps
      // the request inside the function's timeout and costs materially less,
      // and Opus 5 is strong at this tier.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: RECIPE_SCHEMA },
      },
      messages: [{ role: "user", content }],
    });

    if (message.stop_reason === "refusal") {
      return bad(
        422,
        "That video couldn't be processed. Try a different one.",
        "refused",
      );
    }
    if (message.stop_reason === "max_tokens") {
      return bad(
        502,
        "The recipe came back incomplete. Try again.",
        "truncated",
      );
    }

    const text = message.content.find((b) => b.type === "text")?.text;
    if (!text) {
      return bad(502, "The model returned no recipe.", "empty_response");
    }

    // Guaranteed parseable by the schema constraint above, but a corrupted
    // response shouldn't take down the function.
    let recipe;
    try {
      recipe = JSON.parse(text);
    } catch {
      return bad(502, "The recipe response could not be read.", "unparseable");
    }

    return new Response(
      JSON.stringify({ recipe, usage: message.usage }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (err) {
    const status = err?.status;
    if (status === 401) {
      return bad(503, "The server's API key was rejected.", "bad_key");
    }
    if (status === 429) {
      return bad(429, "Rate limited. Wait a moment and try again.", "rate_limited");
    }
    console.error("extract-recipe failed", err);
    return bad(502, "Recipe extraction failed. Try again.", "upstream_error");
  }
};

export const config = { path: "/api/extract-recipe" };
