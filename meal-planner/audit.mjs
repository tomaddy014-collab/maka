// Coverage + integrity audit for the recipe pool.
import { MOCK_RECIPES } from "./src/lib/mockRecipePool.js";
import { CUISINE_OPTIONS, DIETARY_OPTIONS } from "./src/lib/constants.js";

const SLOTS = ["Breakfast", "Lunch", "Dinner"];
const cuisines = CUISINE_OPTIONS.filter((c) => c !== "surprise");
let problems = 0;

console.log(`Total recipes: ${MOCK_RECIPES.length}\n`);

// 1. Every cuisine x slot must have at least 2 recipes.
console.log("--- cuisine x slot coverage ---");
for (const c of cuisines) {
  const row = SLOTS.map((s) => {
    const n = MOCK_RECIPES.filter((r) => r.cuisine === c && r.slot === s).length;
    if (n < 2) problems++;
    return `${s.slice(0, 1)}:${n}${n < 2 ? "!!" : ""}`;
  });
  console.log(`${c.padEnd(16)} ${row.join("  ")}`);
}

// 2. Cuisines present in data but missing from the dropdown (unreachable).
const listed = new Set(cuisines);
const orphan = [...new Set(MOCK_RECIPES.map((r) => r.cuisine))].filter(
  (c) => !listed.has(c),
);
if (orphan.length) {
  console.log("\n!! cuisines in data but not selectable:", orphan);
  problems++;
}

// 3. Dietary tag honesty — spot-check tags against ingredient text.
const MEAT = /\b(chicken|beef|pork|lamb|bacon|sausage|ham|pastrami|guanciale|lardon|pâté|anchov)/i;
const FISH = /\b(salmon|prawn|fish|tuna|squid|mussel|cod|haddock|anchov|dashi|bonito)/i;
// Plant milks, nut butters and butter *lettuce* are not dairy.
const DAIRY =
  /((?<!coconut |oat |almond |soy |rice )\bmilk|(?<!peanut |almond |cashew |nut )\bbutter\b(?! lettuce)|\b(cream|cheese|yogurt|feta|parmesan|paneer|ghee|crema|mozzarella|pecorino|gruy|cheddar|queso|kefalotyri))/i;
const EGG = /\begg/i;
// "bunch" is not "bun"; anchor the short words at both ends. Tamari is
// labelled "(gluten-free soy sauce)" in the data, so exempt that phrase.
const GLUTEN =
  /(\b(flour|bread|pita|baguette|brioche|noodle|pasta|spaghetti|panko|breadcrumb|wonton|couscous|semolina|flatbread|barley|beer|hoisin|doubanjiang|gochujang)|\b(rolls?|buns?)\b|(?<!gluten-free )\bsoy sauce\b)/i;

console.log("\n--- dietary tag check ---");
for (const r of MOCK_RECIPES) {
  const text = r.ingredients.join(" | ");
  const tags = r.dietary_tags;
  const flag = (msg) => {
    console.log(`!! ${r.title} [${tags.join(",")}] — ${msg}`);
    problems++;
  };
  if (tags.includes("Vegan")) {
    if (MEAT.test(text)) flag("Vegan but has meat");
    if (FISH.test(text)) flag("Vegan but has fish");
    if (DAIRY.test(text)) flag("Vegan but has dairy");
    if (EGG.test(text)) flag("Vegan but has egg");
  }
  if (tags.includes("Vegetarian")) {
    if (MEAT.test(text)) flag("Vegetarian but has meat");
    if (FISH.test(text)) flag("Vegetarian but has fish");
  }
  if (tags.includes("Dairy-Free") && DAIRY.test(text)) flag("Dairy-Free but has dairy");
  if (tags.includes("Gluten-Free") && GLUTEN.test(text)) flag("Gluten-Free but has gluten");
  if (tags.includes("Pescatarian") && MEAT.test(text)) flag("Pescatarian but has meat");
}

// 4. Structural sanity.
console.log("\n--- structure ---");
for (const r of MOCK_RECIPES) {
  if (!SLOTS.includes(r.slot)) { console.log(`!! ${r.title}: bad slot`); problems++; }
  if (!r.ingredients?.length) { console.log(`!! ${r.title}: no ingredients`); problems++; }
  if (!r.steps?.length) { console.log(`!! ${r.title}: no steps`); problems++; }
  if (!(r.servings > 0)) { console.log(`!! ${r.title}: bad servings`); problems++; }
  if (typeof r.time_minutes !== "number") { console.log(`!! ${r.title}: bad time`); problems++; }
  const bad = r.dietary_tags.filter((t) => !DIETARY_OPTIONS.includes(t));
  if (bad.length) { console.log(`!! ${r.title}: unknown tag ${bad}`); problems++; }
}

// 5. Duplicate titles.
const seen = new Map();
for (const r of MOCK_RECIPES) {
  const k = r.title.toLowerCase();
  if (seen.has(k)) { console.log(`!! duplicate title: ${r.title}`); problems++; }
  seen.set(k, true);
}

console.log(`\n${problems === 0 ? "PASS — no problems" : `FAIL — ${problems} problem(s)`}`);
process.exit(problems === 0 ? 0 : 1);
