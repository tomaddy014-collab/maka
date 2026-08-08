import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, FileVideo, Sparkles, Upload } from "lucide-react";
import RecipeCard from "./RecipeCard.jsx";
import RecipeForm from "./RecipeForm.jsx";
import Spinner from "./Spinner.jsx";
import InlineError from "./InlineError.jsx";
import { recipeFromVideo } from "../lib/recipeFromVideo.js";

const STAGE_LABEL = {
  reading: "Reading frames from the video...",
  extracting: "Reading the recipe...",
};

const CONFIDENCE_COPY = {
  high: null, // nothing worth interrupting the user for
  medium: "Some details were inferred — worth a quick check before saving.",
  low: "Much of this was guessed. Check it carefully before saving.",
};

export default function ImportVideoTab({ slot, onAssign }) {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);

  async function handleExtract() {
    setBusy(true);
    setError(null);
    setResult(null);
    setEditing(false);
    try {
      const out = await recipeFromVideo(file, { caption, onStage: setStage });
      setResult(out);
    } catch (err) {
      setError({
        message: err.message || "Something went wrong.",
        retryable: err.retryable !== false,
      });
    } finally {
      setBusy(false);
      setStage(null);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    setEditing(false);
    if (inputRef.current) inputRef.current.value = "";
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
      {!result && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-steel px-4 py-8 text-center transition-colors hover:border-mint hover:bg-mint-tint disabled:opacity-60 cursor-pointer"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mint-tint text-mint">
              {file ? <FileVideo size={20} /> : <Upload size={20} />}
            </span>
            <span className="text-sm font-semibold text-ink">
              {file ? file.name : "Choose a video"}
            </span>
            <span className="text-xs text-ink-soft">
              {file
                ? `${(file.size / 1024 / 1024).toFixed(1)} MB · tap to change`
                : "Your video stays on this device — only still frames are sent"}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setError(null);
            }}
          />

          <div className="mt-4">
            <label
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink-soft"
              htmlFor="iv-caption"
            >
              Caption <span className="text-mint">— paste it if you can</span>
            </label>
            <textarea
              id="iv-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Paste the post's caption here. Most creators write the full recipe in it, and it gives by far the most accurate result."
              className="min-h-24 w-full resize-y rounded-xl border border-steel bg-surface px-3.5 py-2.5 text-sm text-ink placeholder-ink-soft/50 transition-colors focus:border-mint outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleExtract}
            disabled={busy || !file}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-mint px-4 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {busy ? <Spinner /> : <Sparkles size={15} />}
            {busy ? STAGE_LABEL[stage?.stage] || "Working..." : "Extract recipe"}
          </button>

          {busy && stage?.stage === "reading" && (
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-soft">
              <div
                className="h-full rounded-full bg-mint transition-[width] duration-200"
                style={{ width: `${Math.round((stage.progress || 0) * 100)}%` }}
              />
            </div>
          )}

          {error && (
            <div className="mt-3">
              <InlineError
                message={error.message}
                onRetry={error.retryable ? handleExtract : undefined}
              />
            </div>
          )}

          {!busy && !error && !file && (
            <p className="mt-6 text-center text-xs leading-relaxed text-ink-soft">
              Frames are read in your browser and sent for reading. Spoken-only
              recipes won't be picked up — paste the caption for those.
            </p>
          )}
        </>
      )}

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {(result.meta.demo || CONFIDENCE_COPY[result.meta.confidence]) && (
              <div className="mb-3 flex items-start gap-2.5 rounded-2xl bg-coral-tint px-4 py-3 text-sm text-ink">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-coral" />
                <div>
                  <p className="font-semibold">
                    {result.meta.demo
                      ? "Demo mode"
                      : CONFIDENCE_COPY[result.meta.confidence]}
                  </p>
                  {result.meta.notes && (
                    <p className="mt-0.5 text-ink-soft">{result.meta.notes}</p>
                  )}
                </div>
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
            <button
              type="button"
              onClick={reset}
              className="mt-2 w-full rounded-full px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:text-ink cursor-pointer"
            >
              Try a different video
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
