import Anthropic from "@anthropic-ai/sdk";
import {
  PANTRY_SCHEMA,
  jsonError,
  mapUpstreamError,
  readRequest,
  readStructured,
} from "../shared/schemas.mjs";

// Reads photos of a fridge, pantry or worktop and lists the food it can see.
//
// Deliberately a separate step from generating a recipe: vision misses jars at
// the back and mislabels look-alike packaging, so the user gets to correct the
// list before anything is cooked from it. It also means one set of photos can
// feed several meals across the week without re-shooting.

const SYSTEM_PROMPT = `You identify food in photographs of someone's fridge, freezer, pantry or kitchen worktop.

List only what you can actually see. This list is used to decide what someone can cook tonight, so a confident-sounding mistake is worse than an omission.

Rules:
- One entry per distinct item. Merge obvious duplicates (three of the same yoghurt pot is one entry).
- Use the short name a person would say: "cheddar", not "block of mature cheddar cheese in plastic wrap".
- Do not infer items that are merely likely to be in a kitchen. If you cannot see salt, do not list salt.
- Set confidence honestly. Use "low" when you are inferring from a silhouette or a partly hidden label, and prefer listing an uncertain item as low confidence over omitting it.
- Ignore non-food: cleaning products, containers, appliances, cutlery.
- If a photo contains no food at all, return an empty items array and say so in notes.`;

export default async (req) => {
  const { body, error } = await readRequest(req);
  if (error) return error;

  const images = Array.isArray(body.images) ? body.images.slice(0, 6) : [];
  if (images.length === 0) {
    return jsonError(400, "Send at least one photo.", "empty_input");
  }

  const content = images.map((data) => ({
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data },
  }));
  content.push({
    type: "text",
    text:
      images.length === 1
        ? "This is a photo of my kitchen. List the food you can see."
        : `These are ${images.length} photos of my kitchen. List the food you can see across all of them, merging duplicates that appear in more than one photo.`,
  });

  try {
    const message = await new Anthropic().messages.create({
      model: "claude-opus-5",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      // Recognition, not reasoning — low effort keeps this inside the
      // function timeout and costs a fraction as much.
      output_config: { effort: "low", format: { type: "json_schema", schema: PANTRY_SCHEMA } },
      messages: [{ role: "user", content }],
    });

    const { data, error: readError } = readStructured(message, "ingredient list");
    if (readError) return readError;

    return new Response(JSON.stringify({ ...data, usage: message.usage }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return mapUpstreamError(err, "identify-ingredients");
  }
};

export const config = { path: "/api/identify-ingredients" };
