import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Camera, Plus, RefreshCw, ShoppingBasket, Sparkles, X } from "lucide-react";
import RecipeCard from "./RecipeCard.jsx";
import RecipeForm from "./RecipeForm.jsx";
import Spinner from "./Spinner.jsx";
import InlineError from "./InlineError.jsx";
import {
  clearPantry,
  identifyIngredients,
  loadPantry,
  recipeFromPantry,
  savePantry,
} from "../lib/pantry.js";
import { DIETARY_OPTIONS, TIME_OPTIONS } from "../lib/constants.js";

const selectClass =
  "w-full rounded-xl border border-steel bg-surface px-3 py-2.5 text-sm text-ink focus:border-mint outline-none";
const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink-soft";

export default function PantryTab({ slot, onAssign }) {
  const [items, setItems] = useState([]);
  const [savedAt, setSavedAt] = useState(null);
  const [busy, setBusy] = useState(null); // 'identify' | 'cook'
  const [stage, setStage] = useState(null);
  const [error, setError] = useState(null);
  const [demo, setDemo] = useState(false);
  const [filters, setFilters] = useState({ dietary: "none", time: "any" });
  const [result, setResult] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [seen, setSeen] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    const saved = loadPantry();
    if (saved) {
      setItems(saved.items);
      setSavedAt(saved.savedAt);
    }
  }, []);

  function persist(next) {
    setItems(next);
    if (next.length) setSavedAt(savePantry(next).savedAt);
    else {
      clearPantry();
      setSavedAt(null);
    }
  }

  async function handlePhotos(files) {
    if (!files?.length) return;
    setBusy("identify");
    setError(null);
    setResult(null);
    try {
      const out = await identifyIngredients(files, { onStage: setStage });
      setDemo(out.demo);
      // Merge with whatever is already listed rather than replacing it — a
      // second photo of the pantry shouldn't wipe the fridge.
      const names = out.items.map((i) => i.name);
      const merged = [...new Set([...items, ...names])];
      persist(merged);
      if (out.notes) setError({ message: out.notes, retryable: false, soft: true });
    } catch (err) {
      setError({ message: err.message, retryable: err.retryable !== false });
    } finally {
      setBusy(null);
      setStage(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleCook() {
    setBusy("cook");
    setError(null);
    setResult(null);
    setEditing(false);
    try {
      const out = await recipeFromPantry(items, { slot, ...filters, avoid: seen });
      setResult(out);
      setSeen((s) => [...s, out.recipe.title].slice(-8));
    } catch (err) {
      setError({ message: err.message, retryable: err.retryable !== false });
    } finally {
      setBusy(null);
    }
  }

  function addDraft() {
    const value = draft.trim().toLowerCase();
    if (!value) return;
    if (!items.includes(value)) persist([...items, value]);
    setDraft("");
  }

  if (result && editing) {
    return (
      <RecipeForm
        initial={result.recipe}
        submitLabel={`Add to ${slot}`}
        onSubmit={(data) => onAssign(data)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy !== null}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-steel px-4 py-5 text-sm font-semibold text-ink transition-colors hover:border-mint hover:bg-mint-tint disabled:opacity-60 cursor-pointer"
      >
        {busy === "identify" ? <Spinner /> : <Camera size={18} className="text-mint" />}
        {busy === "identify"
          ? stage?.stage === "encoding"
            ? "Preparing photos..."
            : "Looking at your kitchen..."
          : items.length
            ? "Add another photo"
            : "Photograph your fridge or pantry"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={(e) => handlePhotos(Array.from(e.target.files || []))}
      />

      {error && (
        <div className="mt-3">
          {error.soft ? (
            <p className="rounded-2xl bg-surface-soft px-4 py-2.5 text-xs text-ink-soft">
              {error.message}
            </p>
          ) : (
            <InlineError
              message={error.message}
              onRetry={error.retryable ? () => setError(null) : undefined}
            />
          )}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between">
            <p className={labelClass + " mb-0"}>
              In your kitchen ({items.length})
            </p>
            <button
              type="button"
              onClick={() => persist([])}
              className="text-[11px] font-medium text-ink-soft underline underline-offset-2 hover:text-coral cursor-pointer"
            >
              Clear all
            </button>
          </div>

          {/* Editing this list matters more than the photo step: vision will
              miss a jar at the back and occasionally invent one. */}
          <div className="flex flex-wrap gap-1.5">
            {items.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 rounded-full bg-mint-tint py-1 pl-3 pr-1.5 text-xs font-medium text-mint"
              >
                {item}
                <button
                  type="button"
                  onClick={() => persist(items.filter((i) => i !== item))}
                  aria-label={`Remove ${item}`}
                  className="rounded-full p-0.5 transition-colors hover:bg-mint hover:text-white cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <div className="mt-2.5 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDraft();
                }
              }}
              placeholder="Add something it missed"
              className="flex-1 rounded-xl border border-steel bg-surface px-3 py-2 text-sm text-ink placeholder-ink-soft/50 focus:border-mint outline-none"
            />
            <button
              type="button"
              onClick={addDraft}
              aria-label="Add ingredient"
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-surface-soft text-ink transition-colors hover:bg-mint hover:text-white cursor-pointer"
            >
              <Plus size={16} />
            </button>
          </div>

          {savedAt && (
            <p className="mt-2 text-[11px] text-ink-soft">
              Saved on this device — it'll still be here next time.
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="pt-dietary">Dietary</label>
              <select
                id="pt-dietary"
                className={selectClass}
                value={filters.dietary}
                onChange={(e) => setFilters((f) => ({ ...f, dietary: e.target.value }))}
              >
                {DIETARY_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d === "none" ? "No restrictions" : d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="pt-time">Time</label>
              <select
                id="pt-time"
                className={selectClass}
                value={filters.time}
                onChange={(e) => setFilters((f) => ({ ...f, time: e.target.value }))}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCook}
            disabled={busy !== null}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-mint px-4 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {busy === "cook" ? <Spinner /> : result ? <RefreshCw size={15} /> : <Sparkles size={15} />}
            {busy === "cook"
              ? "Finding something..."
              : result
                ? "Suggest another"
                : `What can I make for ${slot.toLowerCase()}?`}
          </button>
        </div>
      )}

      {items.length === 0 && !busy && !error && (
        <p className="mt-6 text-center text-xs leading-relaxed text-ink-soft">
          Take a couple of photos — fridge shelves, the pantry, the veg drawer.
          You'll get to correct the list before anything is suggested.
        </p>
      )}

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.recipe.title}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5"
          >
            {(demo || result.meta.demo || result.meta.notes) && (
              <div className="mb-3 flex items-start gap-2.5 rounded-2xl bg-surface-soft px-4 py-3 text-xs text-ink-soft">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-coral" />
                <p>{result.meta.notes || "Generated from the list above."}</p>
              </div>
            )}

            {result.meta.missing.length > 0 && (
              <div className="mb-3 rounded-2xl bg-coral-tint px-4 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-coral">
                  <ShoppingBasket size={13} />
                  You'd still need ({result.meta.missing.length})
                </p>
                <p className="mt-1 text-sm text-ink">
                  {result.meta.missing.join(", ")}
                </p>
              </div>
            )}

            <RecipeCard recipe={result.recipe} animate />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-full bg-surface-soft px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-steel/60 cursor-pointer"
              >
                Edit details
              </button>
              <button
                type="button"
                onClick={() => onAssign(result.recipe)}
                className="rounded-full bg-mint px-4 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] cursor-pointer"
              >
                Use for {slot}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
