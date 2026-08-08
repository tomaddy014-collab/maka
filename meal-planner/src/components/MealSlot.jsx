import { Clock, Plus, ChevronRight } from "lucide-react";

export default function MealSlot({ slot, recipe, onClick }) {
  if (!recipe) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-surface-soft active:scale-[0.99] cursor-pointer"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint-tint text-mint">
          <Plus size={15} />
        </span>
        <span className="text-sm font-medium text-ink-soft">Plan {slot}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-surface-soft active:scale-[0.99] cursor-pointer"
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-mint">
          {slot}
        </p>
        <p className="truncate text-base font-semibold leading-tight text-ink">
          {recipe.title}
        </p>
        {recipe.time_minutes != null && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
            <Clock size={12} />
            {recipe.time_minutes} min
          </p>
        )}
      </div>
      <ChevronRight size={18} className="shrink-0 text-steel-deep" />
    </button>
  );
}
