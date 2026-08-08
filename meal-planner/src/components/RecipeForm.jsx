import { useState } from "react";

const fieldClass =
  "w-full rounded-xl border border-steel bg-surface px-3.5 py-2.5 text-sm text-ink placeholder-ink-soft/50 transition-colors focus:border-mint outline-none";
const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink-soft";

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
          className={`${fieldClass} min-h-28 resize-y`}
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
          className={`${fieldClass} min-h-28 resize-y`}
          value={form.steps}
          onChange={(e) => update("steps", e.target.value)}
          placeholder={"Preheat oven to 200C.\nMix dry ingredients."}
        />
      </div>

      {error && <p className="text-xs font-medium text-coral">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-full bg-mint px-5 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.97] cursor-pointer"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
