import Anthropic from "@anthropic-ai/sdk";
import {
  PANTRY_RECIPE_SCHEMA,
  jsonError,
  mapUpstreamError,
  readRequest,
  readStructured,
} from "../shared/schemas.mjs";

// Builds a recipe around ingredients the user already has, and says plainly
// what (if anything) they'd still need to buy.

const TIME_TEXT = {
  any: "no particular time limit",
  under20: "ready in under 20 minutes",
  under40: "ready in under 40 minutes",
  norush: "can take a while; a more involved dish is fine",
};

const SYSTEM_PROMPT = `You suggest one real, cookable dish built around ingredients someone already has in their kitchen.

Rules:
- Lean on the provided ingredients. A good answer uses several of them, not one.
- You may assume basic staples (salt, pepper, cooking oil, water) without listing them as missing.
- Anything else the dish needs that is not on their list goes in "missing", and stays in "ingredients" too so the recipe is complete. Keep "missing" as short as you can — a recipe needing six extra things is a bad suggestion.
- Never claim they have something that is not on their list.
- Respect the meal and any dietary requirement absolutely. A dietary tag is a hard constraint, not a preference: if they asked for vegan, do not use the eggs on their list.
- Prefer a genuinely good dish over one that crowbars in every ingredient. Ignoring some of the list is fine.
- Give a specific named dish, not "vegetable stir fry with whatever you have".`;

export default async (req) => {
  const { body, error } = await readRequest(req);
  if (error) return error;

  const items = Array.isArray(body.items)
    ? body.items.map((s) => String(s).trim()).filter(Boolean).slice(0, 100)
    : [];
  if (items.length === 0) {
    return jsonError(400, "Send at least one ingredient.", "empty_input");
  }

  const slot = ["Breakfast", "Lunch", "Dinner"].includes(body.slot) ? body.slot : "Dinner";
  const dietary = typeof body.dietary === "string" && body.dietary !== "none" ? body.dietary : null;
  const time = TIME_TEXT[body.time] || TIME_TEXT.any;
  const avoid = Array.isArray(body.avoid) ? body.avoid.filter(Boolean).slice(0, 10) : [];

  const prompt = [
    `I have these ingredients:\n${items.map((i) => `- ${i}`).join("\n")}`,
    ``,
    `Suggest one ${slot.toLowerCase()} I can make.`,
    `Time: ${time}.`,
    dietary ? `Dietary requirement (hard constraint): ${dietary}.` : `No dietary restrictions.`,
    avoid.length
      ? `\nDo not suggest these, I've already seen them: ${avoid.join(", ")}.`
      : "",
  ].join("\n");

  try {
    const message = await new Anthropic().messages.create({
      model: "claude-opus-5",
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: PANTRY_RECIPE_SCHEMA },
      },
      messages: [{ role: "user", content: prompt }],
    });

    const { data, error: readError } = readStructured(message, "recipe");
    if (readError) return readError;

    return new Response(JSON.stringify({ recipe: data, usage: message.usage }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return mapUpstreamError(err, "recipe-from-pantry");
  }
};

export const config = { path: "/api/recipe-from-pantry" };
