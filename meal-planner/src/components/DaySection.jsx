import MealSlot from "./MealSlot.jsx";
import { SLOTS, dayDateLabel } from "../lib/dates.js";

export default function DaySection({ day, weekKey, slots, onSlotClick }) {
  return (
    <section className="rounded-xl bg-charcoal-light p-4">
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="font-display text-lg text-paper">{day}</h3>
        <span className="font-mono text-xs text-paper/40">
          {dayDateLabel(weekKey, day)}
        </span>
      </div>
      <div className="space-y-2">
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
