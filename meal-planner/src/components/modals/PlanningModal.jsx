import { useState } from "react";
import { Shuffle as ShuffleIcon, Clock } from "lucide-react";
import Modal from "../Modal.jsx";
import RecipeCard from "../RecipeCard.jsx";
import RecipeForm from "../RecipeForm.jsx";
import Spinner from "../Spinner.jsx";
import InlineError from "../InlineError.jsx";
import { callLLM, parseJSONResponse } from "../../lib/llm.js";
import { buildRecipePrompt } from "../../lib/prompts.js";
import { hydrateRecipe } from "../../lib/recipeUtils.js";
import { CUISINE_OPTIONS, DIETARY_OPTIONS, TIME_OPTIONS } from "../../lib/constants.js";

const TABS = [
  { id: "shuffle", label: "Shuffle" },
  { id: "favorites", label: "Favourites" },
  { id: "own", label: "Add my own" },
];

const selectClass =
  "w-full rounded-lg border border-paper/15 bg-charcoal px-3 py-2 text-sm text-paper focus:border-rust outline-none";

export default function PlanningModal({ day, slot, favorites, onAssign, onClose }) {
  const [tab, setTab] = useState("shuffle");
  const [filters, setFilters] = useState({ cuisine: "surprise", dietary: "none", time: "any" });
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleShuffle() {
    setLoading(true);
    setError("");
    try {
      const prompt = buildRecipePrompt({ slot, ...filters });
      const raw = await callLLM(prompt);
      const parsed = parseJSONResponse(raw);
      if (!parsed.ok) throw new Error("Could not parse the recipe response.");
      setGenerated(hydrateRecipe(parsed.data));
    } catch {
      setError("Couldn't generate a recipe. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow={day}
      title={`Plan ${slot}`}
      size="lg"
    >
      <div className="mb-4 flex gap-1 border-b border-paper/10 pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-3 py-2 font-mono text-xs uppercase tracking-wide transition-colors cursor-pointer ${
              tab === t.id
                ? "bg-rust/15 text-rust"
                : "text-paper/60 hover:text-paper"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "shuffle" && (
        <div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block font-mono text-[11px] uppercase tracking-widest text-paper/60">
                Cuisine
              </label>
              <select
                className={selectClass}
                value={filters.cuisine}
                onChange={(e) => setFilters((f) => ({ ...f, cuisine: e.target.value }))}
              >
                {CUISINE_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c === "surprise" ? "Surprise me" : c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-mono text-[11px] uppercase tracking-widest text-paper/60">
                Dietary
              </label>
              <select
                className={selectClass}
                value={filters.dietary}
                onChange={(e) => setFilters((f) => ({ ...f, dietary: e.target.value }))}
              >
                {DIETARY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d === "none" ? "No restrictions" : d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-mono text-[11px] uppercase tracking-widest text-paper/60">
                Time
              </label>
              <select
                className={selectClass}
                value={filters.time}
                onChange={(e) => setFilters((f) => ({ ...f, time: e.target.value }))}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShuffle}
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-rust px-4 py-2.5 font-mono text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {loading ? <Spinner /> : <ShuffleIcon size={15} />}
            {generated ? "Shuffle again" : "Shuffle"}
          </button>

          {error && (
            <div className="mt-3">
              <InlineError message={error} onRetry={handleShuffle} />
            </div>
          )}

          {!generated && !loading && !error && (
            <p className="mt-6 text-center font-mono text-xs text-paper/40">
              Set your filters and hit shuffle for a {slot.toLowerCase()} idea.
              <br />
              <Clock size={12} className="mx-auto mt-2 opacity-50" />
            </p>
          )}

          {generated && (
            <div className="mt-4">
              <RecipeCard recipe={generated} animate />
              <button
                type="button"
                onClick={() => onAssign(generated)}
                className="mt-4 w-full rounded-lg bg-sage px-4 py-2.5 font-mono text-sm font-semibold text-ink transition-opacity hover:opacity-90 cursor-pointer"
              >
                Use for {slot}
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "favorites" && (
        <div>
          {favorites.length === 0 ? (
            <p className="py-8 text-center font-mono text-sm text-paper/50">
              No favourites saved yet. Heart a recipe from its detail view to
              save it here.
            </p>
          ) : (
            <ul className="space-y-2">
              {favorites.map((fav) => (
                <li key={fav.id}>
                  <button
                    type="button"
                    onClick={() => onAssign(hydrateRecipe({ ...fav, id: undefined }))}
                    className="flex w-full items-center justify-between gap-3 rounded-lg bg-paper px-4 py-3 text-left text-ink transition-transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg leading-tight">
                        {fav.title}
                      </p>
                      <p className="font-mono text-xs text-ink/60">
                        {fav.cuisine}
                        {fav.time_minutes != null ? ` · ${fav.time_minutes} min` : ""}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "own" && (
        <RecipeForm submitLabel={`Add to ${slot}`} onSubmit={(data) => onAssign(hydrateRecipe(data))} />
      )}
    </Modal>
  );
}
