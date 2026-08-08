import { useState } from "react";

const fieldClass =
  "w-full rounded-lg border border-paper/15 bg-charcoal px-3 py-2 text-sm text-paper placeholder-paper/30 focus:border-rust outline-none";
const labelClass =
  "mb-1 block font-mono text-[11px] uppercase tracking-widest text-paper/60";

function blankState(initial) {
  return {
    title: initial?.title || "",
    description: initial?.description || "",
    cuisine: initial?.cuisine || "",
    time_minutes: initial?.time_minutes ?? "",
    servings: initial?.servings ?? 2,
    dietary_tags: (initial?.dietary_tags || []).join(", "),
    ingredients: (initial?.ingredients || []).join("\n"),
    steps: (initial?.steps || []).join("\n"),
  };
}

export default function RecipeForm({ initial, submitLabel = "Save", onSubmit, onCancel }) {
  const [form, setForm] = useState(() => blankState(initial));
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Give the recipe a title.");
      return;
    }
    const ingredients = form.ingredients
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const steps = form.steps
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (ingredients.length === 0) {
      setError("Add at least one ingredient.");
      return;
    }

    onSubmit({
      id: initial?.id,
      title: form.title.trim(),
      description: form.description.trim(),
      cuisine: form.cuisine.trim(),
      time_minutes: form.time_minutes === "" ? null : Number(form.time_minutes),
      servings: Number(form.servings) || 1,
      dietary_tags: form.dietary_tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 3),
      ingredients,
      steps,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="rf-title">Title</label>
        <input
          id="rf-title"
          className={fieldClass}
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Weeknight lentil curry"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="rf-description">Description</label>
        <textarea
          id="rf-description"
          className={`${fieldClass} min-h-16 resize-y`}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="A quick weeknight favorite..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="rf-cuisine">Cuisine</label>
          <input
            id="rf-cuisine"
            className={fieldClass}
            value={form.cuisine}
            onChange={(e) => update("cuisine", e.target.value)}
            placeholder="Indian"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="rf-tags">Dietary tags</label>
          <input
            id="rf-tags"
            className={fieldClass}
            value={form.dietary_tags}
            onChange={(e) => update("dietary_tags", e.target.value)}
            placeholder="Vegetarian, Gluten-Free"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="rf-time">Time (minutes)</label>
          <input
            id="rf-time"
            type="number"
            min="0"
            className={fieldClass}
            value={form.time_minutes}
            onChange={(e) => update("time_minutes", e.target.value)}
            placeholder="30"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="rf-servings">Servings</label>
          <input
            id="rf-servings"
            type="number"
            min="1"
            className={fieldClass}
            value={form.servings}
            onChange={(e) => update("servings", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="rf-ingredients">
          Ingredients (one per line, with quantity)
        </label>
        <textarea
          id="rf-ingredients"
          className={`${fieldClass} min-h-28 resize-y font-mono`}
          value={form.ingredients}
          onChange={(e) => update("ingredients", e.target.value)}
          placeholder={"2 cups flour\n1 tsp salt"}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="rf-steps">
          Steps (one per line)
        </label>
        <textarea
          id="rf-steps"
          className={`${fieldClass} min-h-28 resize-y font-mono`}
          value={form.steps}
          onChange={(e) => update("steps", e.target.value)}
          placeholder={"Preheat oven to 200C.\nMix dry ingredients."}
        />
      </div>

      {error && <p className="font-mono text-xs text-rust">{error}</p>}

      <div className="flex justify-end gap-3 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 font-mono text-sm text-paper/70 transition-colors hover:text-paper cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-lg bg-rust px-4 py-2 font-mono text-sm font-semibold text-paper transition-opacity hover:opacity-90 cursor-pointer"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
