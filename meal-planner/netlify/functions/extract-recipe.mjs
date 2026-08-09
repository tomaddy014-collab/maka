import Anthropic from "@anthropic-ai/sdk";
import {
  EXTRACTED_RECIPE_SCHEMA,
  jsonError,
  mapUpstreamError,
  readRequest,
  readStructured,
} from "../shared/schemas.mjs";

// Turns video frames (and the post's caption, if the user pasted one) into a
// structured recipe.
//
// This runs server-side for one reason: ANTHROPIC_API_KEY must never reach the
// browser. Anything in the client bundle is readable by anyone who opens
// devtools, so the key lives here and the browser only ever talks to this
// endpoint.

const SYSTEM_PROMPT = `You reconstruct a cookable recipe from a short social-media cooking video.

You are given still frames sampled evenly through the video, and often the post's caption. The caption, when present, is the most reliable source — creators usually write the full recipe there. Use the frames to fill gaps, read on-screen text overlays, and confirm the order of steps.

Rules:
- Report what the source actually shows. Do not invent quantities that are never stated or shown; write the ingredient without a quantity instead, and say so in "notes".
- Prefer the caption over your reading of a frame when they disagree.
- Only apply a dietary tag if every ingredient in your list supports it. A dish with fish is not Vegetarian; a dish with soy sauce is not Gluten-Free.
- Steps describe cooking actions, not filming. Never write "shows the pan" or "cuts to".
- If the video is not a cooking video at all, still fill the schema, set confidence to "low", and say so in "notes".
- Set confidence honestly: "high" only when a caption or clear on-screen text gave you the full ingredient list and method.`;

export default async (req) => {
  const { body, error } = await readRequest(req);
  if (error) return error;

  const frames = Array.isArray(body.frames) ? body.frames.slice(0, 16) : [];
  const caption = typeof body.caption === "string" ? body.caption.trim() : "";

  if (frames.length === 0 && !caption) {
    return jsonError(400, "Send at least one frame or a caption to extract from.", "empty_input");
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

  try {
    const message = await new Anthropic().messages.create({
      model: "claude-opus-5",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      // Structured extraction, not deep reasoning. Low effort keeps the
      // request inside the function's timeout and costs materially less.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: EXTRACTED_RECIPE_SCHEMA },
      },
      messages: [{ role: "user", content }],
    });

    const { data, error: readError } = readStructured(message, "recipe");
    if (readError) return readError;

    return new Response(JSON.stringify({ recipe: data, usage: message.usage }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return mapUpstreamError(err, "extract-recipe");
  }
};

export const config = { path: "/api/extract-recipe" };
