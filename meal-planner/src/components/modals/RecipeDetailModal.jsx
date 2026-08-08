import { useState } from "react";
import { Minus, Plus, Pencil, RefreshCw, Trash2 } from "lucide-react";
import Modal from "../Modal.jsx";
import RecipeCard from "../RecipeCard.jsx";
import Spinner from "../Spinner.jsx";
import InlineError from "../InlineError.jsx";

export default function RecipeDetailModal({
  day,
  slot,
  recipe,
  isFavorite,
  onToggleFavorite,
  onRescale,
  onEdit,
  onReplace,
  onRemove,
  onClose,
}) {
  const [rescaling, setRescaling] = useState(false);
  const [rescaleError, setRescaleError] = useState("");
  const [pendingTarget, setPendingTarget] = useState(null);

  async function handleRescale(delta) {
    const target = Math.max(1, recipe.servings + delta);
    if (target === recipe.servings) return;
    setPendingTarget(target);
    setRescaling(true);
    setRescaleError("");
    try {
      await onRescale(target);
    } catch {
      setRescaleError("Couldn't rescale the ingredients. Try again.");
    } finally {
      setRescaling(false);
    }
  }

  function retryRescale() {
    if (pendingTarget != null) handleRescale(pendingTarget - recipe.servings);
  }

  const servingsControl = (
    <span className="ml-2 inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => handleRescale(-1)}
        disabled={rescaling || recipe.servings <= 1}
        aria-label="Decrease servings"
        className="rounded-full border border-ink/20 p-0.5 text-ink/70 transition-colors hover:bg-ink/5 disabled:opacity-30 cursor-pointer"
      >
        <Minus size={12} />
      </button>
      {rescaling ? (
        <Spinner className="text-ink/50" />
      ) : (
        <button
          type="button"
          onClick={() => handleRescale(1)}
          disabled={rescaling}
          aria-label="Increase servings"
          className="rounded-full border border-ink/20 p-0.5 text-ink/70 transition-colors hover:bg-ink/5 cursor-pointer"
        >
          <Plus size={12} />
        </button>
      )}
    </span>
  );

  return (
    <Modal onClose={onClose} eyebrow={`${day} · ${slot}`} title="Recipe" size="lg">
      <RecipeCard
        recipe={recipe}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        servingsControl={servingsControl}
      />

      {rescaleError && (
        <div className="mt-3">
          <InlineError message={rescaleError} onRetry={retryRescale} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center justify-center gap-1.5 rounded-full bg-surface-soft px-3 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-mint-tint hover:text-mint cursor-pointer"
        >
          <Pencil size={14} /> Edit
        </button>
        <button
          type="button"
          onClick={onReplace}
          className="flex items-center justify-center gap-1.5 rounded-full bg-surface-soft px-3 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-mint-tint hover:text-mint cursor-pointer"
        >
          <RefreshCw size={14} /> Replace
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center justify-center gap-1.5 rounded-full bg-coral-tint px-3 py-2.5 text-xs font-semibold text-coral transition-colors hover:bg-coral hover:text-white cursor-pointer"
        >
          <Trash2 size={14} /> Remove
        </button>
      </div>
    </Modal>
  );
}
