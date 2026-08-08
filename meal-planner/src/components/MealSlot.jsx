import { Clock, Plus, ChevronRight } from "lucide-react";

export default function MealSlot({ slot, recipe, onClick }) {
  if (!recipe) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-paper/25 px-3 py-2.5 text-left font-mono text-sm text-paper/50 transition-colors hover:border-rust/60 hover:text-rust cursor-pointer"
      >
        <Plus size={15} />
        <span>Plan {slot}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2.5 text-left text-ink shadow-sm transition-transform hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50">
          {slot}
        </p>
        <p className="truncate font-display text-base leading-tight">
          {recipe.title}
        </p>
        {recipe.time_minutes != null && (
          <p className="mt-0.5 flex items-center gap-1 font-mono text-xs text-ink/60">
            <Clock size={12} />
            {recipe.time_minutes} min
          </p>
        )}
      </div>
      <ChevronRight size={18} className="shrink-0 text-ink/40" />
    </button>
  );
}
