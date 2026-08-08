const TIME_TEXT = {
  any: "no specific time constraint",
  under20: "must be ready in under 20 minutes total",
  under40: "must be ready in under 40 minutes total",
  norush: "can be a more involved recipe, no rush on time",
};

export function buildRecipePrompt({ slot, cuisine, dietary, time }) {
  const cuisineText =
    !cuisine || cuisine === "surprise"
      ? "surprise me — pick any cuisine you like"
      : cuisine;
  const dietaryText =
    !dietary || dietary === "none" ? "no restrictions" : dietary;
  const timeText = TIME_TEXT[time] || TIME_TEXT.any;

  return `You are a recipe generator inside a weekly meal-planning app.
Generate ONE specific, real, cookable recipe suitable for ${slot}.
It must genuinely suit ${slot.toLowerCase()} — do not just relabel a dish from another meal.
Cuisine: ${cuisineText}
Dietary requirement: ${dietaryText}
Time: ${timeText}
Vary your choice each time you're called — avoid defaulting to the same handful of dishes.

Respond with STRICT JSON only. No markdown, no code fences, no commentary before or after.
Match this exact shape:
{"title":"","description":"","cuisine":"","dietary_tags":[],"time_minutes":0,"servings":0,"ingredients":[],"steps":[]}

Rules:
- "ingredients": each entry includes a quantity, e.g. "2 cups flour".
- "steps": imperative, one action per entry.
- "dietary_tags": 0-3 short tags, e.g. ["Vegetarian"].
- "time_minutes" and "servings" are numbers.`;
}

export function buildRescalePrompt({ ingredients, fromServings, toServings }) {
  return `Rescale this recipe's ingredient list from ${fromServings} servings to ${toServings} servings.

Original ingredients:
${ingredients.map((line) => `- ${line}`).join("\n")}

Respond with STRICT JSON only, no markdown, no commentary before or after.
Match this exact shape:
{"ingredients":[]}

Rules:
- Keep the same number and order of ingredients.
- Round quantities to sensible cooking measurements.
- Each entry stays a single string including its quantity, e.g. "3 cups flour".`;
}

export function buildShoppingListPrompt(meals) {
  const lines = meals
    .map(
      (m) =>
        `${m.day} / ${m.slot} / "${m.title}":\n${m.ingredients
          .map((i) => `  - ${i}`)
          .join("\n")}`,
    )
    .join("\n\n");

  return `Consolidate the ingredient lists below into a single grocery shopping list for the week.
Merge duplicate or similar ingredients and combine quantities sensibly (e.g. "1 cup flour" + "2 cups flour" -> "3 cups flour").
Group every item into exactly one of these categories: Produce, Meat & Seafood, Dairy & Eggs, Pantry, Bakery, Frozen, Other.

Meals planned this week:
${lines}

Respond with STRICT JSON only, no markdown, no commentary before or after.
Match this exact shape:
{"categories":[{"name":"","items":[{"name":"","quantity":""}]}]}`;
}
