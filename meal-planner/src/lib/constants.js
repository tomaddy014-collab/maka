// Every cuisine here has Breakfast, Lunch and Dinner recipes in
// mockRecipePool.js. Adding one without recipes will surface as an
// "unavailable" message in the planner rather than a wrong-cuisine dish.
export const CUISINE_OPTIONS = [
  "surprise",
  "American",
  "British",
  "Chinese",
  "French",
  "Greek",
  "Indian",
  "Italian",
  "Japanese",
  "Korean",
  "Mexican",
  "Middle Eastern",
  "Moroccan",
  "Spanish",
  "Thai",
  "Vietnamese",
];

export const DIETARY_OPTIONS = [
  "none",
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Pescatarian",
];

export const TIME_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "under20", label: "Under 20 min" },
  { value: "under40", label: "Under 40 min" },
  { value: "norush", label: "No rush" },
];

export const GROCERY_CATEGORIES = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Pantry",
  "Bakery",
  "Frozen",
  "Other",
];
