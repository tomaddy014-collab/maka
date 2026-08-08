import { CalendarClock, ClipboardList, NotebookPen } from "lucide-react";

export default function AppHeader({ screen, onChangeScreen, onOpenPastWeeks }) {
  return (
    <header className="sticky top-0 z-30 border-b border-paper/10 bg-charcoal/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <NotebookPen size={20} className="text-rust" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-sage">
              Meal Planner
            </p>
            <h1 className="font-display text-lg leading-none text-paper">
              The Weekly Spread
            </h1>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenPastWeeks}
          aria-label="Past weeks"
          className="flex items-center gap-1.5 rounded-lg border border-paper/15 px-2.5 py-1.5 font-mono text-xs text-paper/80 transition-colors hover:border-sage/50 hover:text-sage cursor-pointer"
        >
          <CalendarClock size={14} />
          <span className="hidden sm:inline">Past weeks</span>
        </button>
      </div>
      <nav className="mx-auto flex max-w-2xl gap-1 px-4 pb-2">
        <button
          type="button"
          onClick={() => onChangeScreen("week")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
            screen === "week"
              ? "bg-rust text-paper"
              : "text-paper/60 hover:text-paper"
          }`}
        >
          <NotebookPen size={13} />
          Week plan
        </button>
        <button
          type="button"
          onClick={() => onChangeScreen("shopping")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
            screen === "shopping"
              ? "bg-rust text-paper"
              : "text-paper/60 hover:text-paper"
          }`}
        >
          <ClipboardList size={13} />
          Shopping list
        </button>
      </nav>
    </header>
  );
}
