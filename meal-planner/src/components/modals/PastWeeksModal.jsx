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
      <Modal onClose={onClose} eyebrow="Repeat a week" title="Past weeks">
        {weeks.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft">
            No past weeks with meals planned yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {weeks.map(([weekKey, count]) => (
              <li key={weekKey}>
                <button
                  type="button"
                  onClick={() => setPending(weekKey)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface-soft px-4 py-3.5 text-left text-ink transition-transform active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarDays size={16} className="text-steel-deep" />
                    <div>
                      <p className="text-base font-semibold leading-tight">
                        {weekDateRangeLabel(weekKey)}
                      </p>
                      {isCurrentWeek(weekKey) && (
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-mint">
                          This week
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-ink-soft">
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
