import { ChevronLeft, ChevronRight } from "lucide-react";
import { isCurrentWeek, weekDateRangeLabel } from "../lib/dates.js";

export default function WeekNav({ weekKey, onPrev, onNext }) {
  return (
    <div className="mx-auto flex max-w-2xl items-center justify-between px-5 pt-5">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous week"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-soft shadow-sm shadow-ink/5 transition-colors hover:text-mint active:scale-[0.94] cursor-pointer"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-mint">
          {isCurrentWeek(weekKey) ? "This week" : "Week of"}
        </p>
        <p className="text-lg font-semibold text-ink">
          {weekDateRangeLabel(weekKey)}
        </p>
      </div>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next week"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-soft shadow-sm shadow-ink/5 transition-colors hover:text-mint active:scale-[0.94] cursor-pointer"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
