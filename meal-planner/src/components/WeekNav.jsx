import { ChevronLeft, ChevronRight } from "lucide-react";
import { isCurrentWeek, weekDateRangeLabel } from "../lib/dates.js";

export default function WeekNav({ weekKey, onPrev, onNext }) {
  return (
    <div className="mx-auto flex max-w-2xl items-center justify-between px-4 pt-4">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous week"
        className="rounded-full p-2 text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper cursor-pointer"
      >
        <ChevronLeft size={20} />
      </button>
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-sage">
          {isCurrentWeek(weekKey) ? "This week" : "Week of"}
        </p>
        <p className="font-display text-lg text-paper">
          {weekDateRangeLabel(weekKey)}
        </p>
      </div>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next week"
        className="rounded-full p-2 text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper cursor-pointer"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
