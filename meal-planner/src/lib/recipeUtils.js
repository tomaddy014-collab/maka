import { makeId } from "./id.js";
import { DAYS, SLOTS } from "./dates.js";

export function hydrateRecipe(data, existingId) {
  return {
    id: existingId || data.id || makeId("recipe"),
    title: data.title || "Untitled recipe",
    description: data.description || "",
    cuisine: data.cuisine || "",
    dietary_tags: Array.isArray(data.dietary_tags) ? data.dietary_tags : [],
    time_minutes:
      typeof data.time_minutes === "number" ? data.time_minutes : null,
    servings: typeof data.servings === "number" && data.servings > 0
      ? data.servings
      : 1,
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
    steps: Array.isArray(data.steps) ? data.steps : [],
  };
}

export function isSameFavorite(a, b) {
  if (a.id && b.id && a.id === b.id) return true;
  return (
    a.title.trim().toLowerCase() === b.title.trim().toLowerCase() &&
    (a.cuisine || "").trim().toLowerCase() ===
      (b.cuisine || "").trim().toLowerCase()
  );
}

export function countPlannedMeals(plan) {
  let count = 0;
  DAYS.forEach((day) => {
    SLOTS.forEach((slot) => {
      if (plan?.[day]?.[slot]) count += 1;
    });
  });
  return count;
}

export function extractPlannedMeals(plan) {
  const meals = [];
  DAYS.forEach((day) => {
    SLOTS.forEach((slot) => {
      const recipe = plan?.[day]?.[slot];
      if (recipe) {
        meals.push({ day, slot, title: recipe.title, ingredients: recipe.ingredients });
      }
    });
  });
  return meals;
}

export function mealsSignature(plan) {
  const parts = [];
  DAYS.forEach((day) => {
    SLOTS.forEach((slot) => {
      const recipe = plan?.[day]?.[slot];
      if (recipe) {
        parts.push(`${day}:${slot}:${recipe.id}:${recipe.servings}`);
      }
    });
  });
  return parts.join("|");
}
