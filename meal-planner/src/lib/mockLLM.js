// Mock implementation of the "LLM" the app talks to. It works purely by
// reading the prompt text produced by lib/prompts.js and returning a JSON
// string, exactly like a real model would. To go live, replace the body of
// `callLLM` in lib/llm.js with a real fetch to Claude/OpenAI/etc — nothing
// else in the app needs to change.

import { MOCK_RECIPES } from "./mockRecipePool.js";
import { GROCERY_CATEGORIES } from "./constants.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const UNIT_WORDS = new Set([
  "cup", "cups", "tbsp", "tablespoon", "tablespoons", "tsp", "teaspoon", "teaspoons",
  "g", "gram", "grams", "kg", "ml", "l", "liter", "liters", "litre", "litres",
  "lb", "lbs", "pound", "pounds", "oz", "ounce", "ounces", "clove", "cloves",
  "can", "cans", "slice", "slices", "sprig", "sprigs", "pinch", "pinches", "knob",
  "head", "bunch", "bunches", "fillet", "fillets", "sheet", "sheets", "ball", "balls",
  "wedge", "wedges", "rasher", "rashers",
]);

function parseIngredientLine(line) {
  const trimmed = line.trim().replace(/^-\s*/, "");
  // Split glued quantity+unit ("120g" -> "120 g") so both parse independently.
  const tokens = trimmed
    .replace(/^(\d+(?:\.\d+)?)([a-zA-Z]+)\b/, "$1 $2")
    .split(/\s+/);
  let i = 0;
  const qtyTokens = [];
  while (i < tokens.length && qtyTokens.length < 2 && /^[\d./]+$/.test(tokens[i])) {
    qtyTokens.push(tokens[i]);
    i++;
  }
  let unit = "";
  if (i < tokens.length && UNIT_WORDS.has(tokens[i].toLowerCase().replace(/\.$/, ""))) {
    unit = tokens[i].toLowerCase().replace(/\.$/, "");
    i++;
  }
  const name = tokens.slice(i).join(" ").replace(/,$/, "").trim();
  return {
    quantityValue: parseQuantityValue(qtyTokens),
    unit,
    name: name || trimmed,
    // Prep/serving notes stripped ("Butter, softened" -> "Butter") so the
    // shopping list merges by the item you actually buy.
    baseName: (name || trimmed).split(",")[0].trim(),
    raw: trimmed,
  };
}

function parseQuantityValue(qtyTokens) {
  if (qtyTokens.length === 0) return null;
  let total = 0;
  for (const t of qtyTokens) {
    if (t.includes("/")) {
      const [n, d] = t.split("/").map(Number);
      if (d) total += n / d;
      else return null;
    } else {
      const v = parseFloat(t);
      if (Number.isNaN(v)) return null;
      total += v;
    }
  }
  return total;
}

function formatQuantityValue(value) {
  if (value == null) return "";
  const rounded = Math.round(value * 4) / 4;
  const whole = Math.floor(rounded);
  const frac = Math.round((rounded - whole) * 100) / 100;
  const fracMap = [[0.25, "1/4"], [0.5, "1/2"], [0.75, "3/4"]];
  const match = fracMap.find(([dec]) => Math.abs(frac - dec) < 0.05);
  if (whole === 0 && match) return match[1];
  if (match) return `${whole} ${match[1]}`;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(Math.round(rounded * 100) / 100);
}

function capitalize(name) {
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---- Recipe generation -----------------------------------------------

const TIME_BUCKET_TEXT = {
  under20: "must be ready in under 20 minutes total",
  under40: "must be ready in under 40 minutes total",
  norush: "can be a more involved recipe, no rush on time",
  any: "no specific time constraint",
};

function extractRecipeParams(prompt) {
  const slotMatch = prompt.match(/suitable for (Breakfast|Lunch|Dinner)\./);
  const cuisineMatch = prompt.match(/Cuisine: (.+)/);
  const dietaryMatch = prompt.match(/Dietary requirement: (.+)/);
  const timeMatch = prompt.match(/Time: (.+)/);

  const slot = slotMatch ? slotMatch[1] : "Dinner";
  const cuisine =
    cuisineMatch && !cuisineMatch[1].startsWith("surprise me")
      ? cuisineMatch[1].trim()
      : "surprise";
  const dietary =
    dietaryMatch && dietaryMatch[1].trim() !== "no restrictions"
      ? dietaryMatch[1].trim()
      : "none";
  let time = "any";
  if (timeMatch) {
    const entry = Object.entries(TIME_BUCKET_TEXT).find(
      ([, text]) => text === timeMatch[1].trim(),
    );
    if (entry) time = entry[0];
  }
  return { slot, cuisine, dietary, time };
}

function filterByTime(pool, time) {
  if (time === "under20") return pool.filter((r) => r.time_minutes <= 20);
  if (time === "under40") return pool.filter((r) => r.time_minutes <= 40);
  if (time === "norush") {
    const slow = pool.filter((r) => r.time_minutes > 40);
    return slow.length ? slow : pool;
  }
  return pool;
}

function generateMockRecipe({ slot, cuisine, dietary, time }) {
  let pool = MOCK_RECIPES[slot] || MOCK_RECIPES.Dinner;

  if (cuisine && cuisine !== "surprise") {
    const byCuisine = pool.filter(
      (r) => r.cuisine.toLowerCase() === cuisine.toLowerCase(),
    );
    if (byCuisine.length) pool = byCuisine;
  }

  if (dietary && dietary !== "none") {
    const byDietary = pool.filter((r) =>
      r.dietary_tags.some((t) => t.toLowerCase() === dietary.toLowerCase()),
    );
    if (byDietary.length) pool = byDietary;
  }

  const byTime = filterByTime(pool, time);
  if (byTime.length) pool = byTime;

  const pick = pool[Math.floor(Math.random() * pool.length)];
  return JSON.parse(JSON.stringify(pick));
}

// ---- Servings rescale ---------------------------------------------------

function extractRescaleParams(prompt) {
  const servingsMatch = prompt.match(/from (\d+) servings to (\d+) servings/);
  const fromServings = servingsMatch ? Number(servingsMatch[1]) : 1;
  const toServings = servingsMatch ? Number(servingsMatch[2]) : 1;

  const block = prompt.match(/Original ingredients:\n([\s\S]*?)\n\nRespond/);
  const ingredients = block
    ? block[1]
        .split("\n")
        .map((l) => l.replace(/^-\s*/, "").trim())
        .filter(Boolean)
    : [];

  return { ingredients, fromServings, toServings };
}

function rescaleMockIngredients({ ingredients, fromServings, toServings }) {
  const ratio = (toServings || 1) / (fromServings || 1);
  const scaled = ingredients.map((line) => {
    const parsed = parseIngredientLine(line);
    if (parsed.quantityValue == null) return line;
    const qtyStr = formatQuantityValue(parsed.quantityValue * ratio);
    const unitStr = parsed.unit ? ` ${parsed.unit}` : "";
    return `${qtyStr}${unitStr} ${parsed.name}`.replace(/\s+/g, " ").trim();
  });
  return { ingredients: scaled };
}

// ---- Shopping list consolidation ----------------------------------------

const CATEGORY_KEYWORDS = {
  "Meat & Seafood": [
    "chicken", "beef", "pork", "bacon", "sausage", "salmon", "fish", "shrimp",
    "guanciale", "pancetta", "lardon", "pastrami", "turkey",
  ],
  "Dairy & Eggs": [
    "egg", "cheese", "mozzarella", "feta", "parmesan", "cheddar", "butter",
    "milk", "cream", "yogurt", "gruyere", "gruyère", "cotija", "swiss",
  ],
  Produce: [
    "onion", "garlic", "tomato", "potato", "carrot", "pepper", "lettuce",
    "spinach", "cucumber", "avocado", "lemon", "lime", "apple", "berry",
    "berries", "banana", "mushroom", "broccoli", "cabbage", "scallion",
    "cilantro", "parsley", "basil", "thyme", "ginger", "chili", "chile",
    "corn", "zucchini", "eggplant", "apricot", "shallot", "kale", "celery",
    "sprout", "herb",
  ],
  Bakery: [
    "bread", "baguette", "brioche", "ciabatta", "bun", "roll", "tortilla",
    "flatbread", "pita", "dough",
  ],
  Frozen: ["frozen"],
  Pantry: [
    "rice", "pasta", "spaghetti", "noodle", "flour", "sugar", "oil",
    "vinegar", "sauce", "stock", "broth", "spice", "cumin", "paprika",
    "cinnamon", "bean", "chickpea", "lentil", "breadcrumb", "honey", "syrup",
    "tamarind", "miso", "soy", "mustard", "mayonnaise", "dressing", "wine",
    "oat", "granola", "nori", "gochujang", "tofu", "sesame", "seed", "yeast",
    "paste", "powder", "salt",
  ],
};

function singularize(word) {
  if (word.length > 3 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 3 && word.endsWith("oes")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
}

function categorize(name) {
  const words = name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map(singularize);
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => words.includes(k))) return category;
  }
  return "Other";
}

function extractShoppingListMeals(prompt) {
  const block = prompt.match(
    /Meals planned this week:\n([\s\S]*?)\n\nRespond/,
  );
  if (!block) return [];
  const chunks = block[1].split(/\n\n+/);
  return chunks.map((chunk) => {
    const lines = chunk.split("\n");
    const ingredients = lines
      .slice(1)
      .map((l) => l.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean);
    return { ingredients };
  });
}

function buildMockShoppingList(meals) {
  const merged = new Map();

  meals.forEach((meal) => {
    meal.ingredients.forEach((line) => {
      const parsed = parseIngredientLine(line);
      const normName = parsed.baseName.toLowerCase().trim();
      if (!normName) return;
      const key = `${normName}|${parsed.unit}`;
      if (!merged.has(key)) {
        merged.set(key, {
          name: parsed.baseName,
          unit: parsed.unit,
          total: 0,
          hasValue: false,
        });
      }
      const entry = merged.get(key);
      if (parsed.quantityValue != null) {
        entry.total += parsed.quantityValue;
        entry.hasValue = true;
      }
    });
  });

  const byCategory = new Map(GROCERY_CATEGORIES.map((c) => [c, []]));
  merged.forEach((entry) => {
    const category = categorize(entry.name);
    const quantity = entry.hasValue
      ? `${formatQuantityValue(entry.total)}${entry.unit ? " " + entry.unit : ""}`.trim()
      : "to taste";
    byCategory.get(category).push({ name: capitalize(entry.name), quantity });
  });

  const categories = GROCERY_CATEGORIES.filter(
    (c) => byCategory.get(c).length > 0,
  ).map((name) => ({ name, items: byCategory.get(name) }));

  return { categories };
}

// ---- Dispatcher -----------------------------------------------------------

export async function mockCallLLM(prompt) {
  await delay(500 + Math.random() * 500);

  if (prompt.startsWith("You are a recipe generator")) {
    return JSON.stringify(generateMockRecipe(extractRecipeParams(prompt)));
  }
  if (prompt.startsWith("Rescale this recipe's ingredient list")) {
    return JSON.stringify(rescaleMockIngredients(extractRescaleParams(prompt)));
  }
  if (prompt.startsWith("Consolidate the ingredient lists")) {
    return JSON.stringify(buildMockShoppingList(extractShoppingListMeals(prompt)));
  }
  throw new Error("Mock LLM could not classify the prompt.");
}
