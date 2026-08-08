import MealSlot from "./MealSlot.jsx";
import { SLOTS, dayDateLabel } from "../lib/dates.js";

export default function DaySection({ day, weekKey, slots, onSlotClick }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-surface shadow-sm shadow-ink/5">
      <div className="flex items-baseline gap-2 px-5 pt-4 pb-1">
        <h3 className="text-lg font-semibold text-ink">{day}</h3>
        <span className="text-xs font-medium text-steel-deep">
          {dayDateLabel(weekKey, day)}
        </span>
      </div>
      <div className="divide-y divide-steel/60">
        {SLOTS.map((slot) => (
          <MealSlot
            key={slot}
            slot={slot}
            recipe={slots?.[slot]}
            onClick={() => onSlotClick(slot, slots?.[slot])}
          />
        ))}
      </div>
    </section>
  );
}
