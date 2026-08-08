import { motion } from "framer-motion";
import { CalendarClock, ChefHat, ClipboardList, CalendarRange } from "lucide-react";

const TABS = [
  { id: "week", label: "Week plan", Icon: CalendarRange },
  { id: "shopping", label: "Shopping list", Icon: ClipboardList },
];

export default function AppHeader({ screen, onChangeScreen, onOpenPastWeeks }) {
  return (
    <header className="sticky top-0 z-30 border-b border-steel/70 bg-bg/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mint text-white">
            <ChefHat size={18} />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-mint">
              Meal Planner
            </p>
            <h1 className="text-lg font-semibold leading-none text-ink">
              The Weekly Spread
            </h1>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenPastWeeks}
          aria-label="Past weeks"
          className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 text-xs font-medium text-ink-soft shadow-sm shadow-ink/5 transition-colors hover:text-mint cursor-pointer"
        >
          <CalendarClock size={15} />
          <span className="hidden sm:inline">Past weeks</span>
        </button>
      </div>
      <nav className="mx-auto max-w-2xl px-5 pb-4">
        <div className="relative flex gap-1 rounded-full bg-surface-soft p-1">
          {TABS.map((tab) => {
            const active = screen === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeScreen(tab.id)}
                className="relative flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors cursor-pointer"
              >
                {active && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-full bg-surface shadow-sm shadow-ink/10"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span
                  className={`relative flex items-center gap-1.5 ${active ? "text-ink" : "text-ink-soft"}`}
                >
                  <tab.Icon size={14} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
