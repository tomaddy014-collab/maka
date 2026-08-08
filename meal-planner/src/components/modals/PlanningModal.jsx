import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shuffle as ShuffleIcon, Clock } from "lucide-react";
import Modal from "../Modal.jsx";
import RecipeCard from "../RecipeCard.jsx";
import RecipeForm from "../RecipeForm.jsx";
import ImportVideoTab from "../ImportVideoTab.jsx";
import Spinner from "../Spinner.jsx";
import InlineError from "../InlineError.jsx";
import { callLLM, parseJSONResponse } from "../../lib/llm.js";
import { buildRecipePrompt } from "../../lib/prompts.js";
import { hydrateRecipe } from "../../lib/recipeUtils.js";
import { isNoMatch } from "../../lib/errors.js";
import { CUISINE_OPTIONS, DIETARY_OPTIONS, TIME_OPTIONS } from "../../lib/constants.js";

const TABS = [
  { id: "shuffle", label: "Shuffle" },
  { id: "favorites", label: "Favourites" },
  { id: "video", label: "From video" },
  { id: "own", label: "Add my own" },
];

const selectClass =
  "w-full rounded-xl border border-steel bg-surface px-3 py-2.5 text-sm text-ink focus:border-mint outline-none";

export default function PlanningModal({ day, slot, favorites, onAssign, onClose }) {
  const [tab, setTab] = useState("shuffle");
  const [filters, setFilters] = useState({ cuisine: "surprise", dietary: "none", time: "any" });
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryable, setRetryable] = useState(true);

  async function handleShuffle() {
    setLoading(true);
    setError("");
    try {
      const prompt = buildRecipePrompt({ slot, ...filters });
      const raw = await callLLM(prompt);
      const parsed = parseJSONResponse(raw);
      if (!parsed.ok) throw new Error("Could not parse the recipe response.");
      setGenerated(hydrateRecipe(parsed.data));
    } catch (err) {
      if (isNoMatch(err)) {
        // Retrying an impossible filter combination just fails again.
        setRetryable(false);
        setError(err.message);
      } else {
        setRetryable(true);
        setError(
          "Couldn't generate a recipe. Check your connection and try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} eyebrow={day} title={`Plan ${slot}`} size="lg">
      <div className="mb-5 flex gap-4 overflow-x-auto border-b border-steel/60 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`relative shrink-0 whitespace-nowrap pb-3 text-sm font-semibold transition-colors cursor-pointer ${
              tab === t.id ? "text-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
            {tab === t.id && (
              <motion.span
                layoutId="planning-tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-mint"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === "shuffle" && (
          <motion.div
            key="shuffle"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
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
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
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
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
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
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-mint px-4 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {loading ? <Spinner /> : <ShuffleIcon size={15} />}
              {generated ? "Shuffle again" : "Shuffle"}
            </button>

            {error && (
              <div className="mt-3">
                <InlineError
                  message={error}
                  onRetry={retryable ? handleShuffle : undefined}
                />
              </div>
            )}

            {!generated && !loading && !error && (
              <p className="mt-8 text-center text-xs text-ink-soft">
                Set your filters and hit shuffle for a {slot.toLowerCase()} idea.
                <Clock size={14} className="mx-auto mt-2 opacity-50" />
              </p>
            )}

            <AnimatePresence mode="wait">
              {generated && (
                <motion.div
                  key={generated.title + generated.cuisine}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-4"
                >
                  <RecipeCard recipe={generated} animate />
                  <button
                    type="button"
                    onClick={() => onAssign(generated)}
                    className="mt-4 w-full rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] cursor-pointer"
                  >
                    Use for {slot}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {tab === "favorites" && (
          <motion.div
            key="favorites"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            {favorites.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-soft">
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
                      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface-soft px-4 py-3.5 text-left text-ink transition-transform active:scale-[0.99] cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold leading-tight">
                          {fav.title}
                        </p>
                        <p className="text-xs text-ink-soft">
                          {fav.cuisine}
                          {fav.time_minutes != null ? ` · ${fav.time_minutes} min` : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}

        {tab === "video" && (
          <motion.div
            key="video"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <ImportVideoTab
              slot={slot}
              onAssign={(data) => onAssign(hydrateRecipe(data))}
            />
          </motion.div>
        )}

        {tab === "own" && (
          <motion.div
            key="own"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <RecipeForm submitLabel={`Add to ${slot}`} onSubmit={(data) => onAssign(hydrateRecipe(data))} />
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
