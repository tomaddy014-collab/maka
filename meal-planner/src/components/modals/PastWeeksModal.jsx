import { useState } from "react";
import { CalendarDays } from "lucide-react";
import Modal from "../Modal.jsx";
import ConfirmDialog from "../ConfirmDialog.jsx";
import { weekDateRangeLabel, isCurrentWeek } from "../../lib/dates.js";

export default function PastWeeksModal({ weeksIndex, viewingWeekKey, onSelect, onClose }) {
  const [pending, setPending] = useState(null);

  const weeks = Object.entries(weeksIndex)
    .filter(([, count]) => count > 0)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <>
      <Modal open onClose={onClose} eyebrow="Repeat a week" title="Past weeks">
        {weeks.length === 0 ? (
          <p className="py-8 text-center font-mono text-sm text-paper/50">
            No past weeks with meals planned yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {weeks.map(([weekKey, count]) => (
              <li key={weekKey}>
                <button
                  type="button"
                  onClick={() => setPending(weekKey)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg bg-paper px-4 py-3 text-left text-ink transition-transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarDays size={16} className="text-ink/50" />
                    <div>
                      <p className="font-display text-base leading-tight">
                        {weekDateRangeLabel(weekKey)}
                      </p>
                      {isCurrentWeek(weekKey) && (
                        <p className="font-mono text-[10px] uppercase tracking-widest text-sage">
                          This week
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-ink/60">
                    {count} meal{count === 1 ? "" : "s"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={pending != null}
        title="Repeat this week?"
        message={`This copies every planned meal from ${pending ? weekDateRangeLabel(pending) : ""} into ${weekDateRangeLabel(
          viewingWeekKey,
        )}, replacing whatever is currently planned there.`}
        confirmLabel="Replace and copy"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          onSelect(pending);
          setPending(null);
        }}
      />
    </>
  );
}
