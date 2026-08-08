import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, RefreshCw, ShoppingBasket } from "lucide-react";
import Spinner from "./Spinner.jsx";
import InlineError from "./InlineError.jsx";
import { weekDateRangeLabel } from "../lib/dates.js";

export default function ShoppingListView({
  weekKey,
  plannedCount,
  shoppingList,
  generating,
  error,
  stale,
  onGenerate,
  onToggleHave,
}) {
  const [haveOpen, setHaveOpen] = useState(false);

  const haveItems = shoppingList?.items?.filter((i) => i.have) || [];
  const toBuyByCategory = new Map();
  (shoppingList?.items || [])
    .filter((i) => !i.have)
    .forEach((item) => {
      if (!toBuyByCategory.has(item.category)) toBuyByCategory.set(item.category, []);
      toBuyByCategory.get(item.category).push(item);
    });

  return (
    <div className="mx-auto max-w-2xl px-5 py-5">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-mint">
          {weekDateRangeLabel(weekKey)}
        </p>
        <h2 className="text-2xl font-semibold text-ink">Shopping list</h2>
      </div>

      {plannedCount === 0 && (
        <p className="rounded-3xl bg-surface p-6 text-center text-sm text-ink-soft shadow-sm shadow-ink/5">
          Plan at least one meal this week to build a shopping list.
        </p>
      )}

      {plannedCount > 0 && !shoppingList && !generating && (
        <button
          type="button"
          onClick={onGenerate}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-mint px-4 py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] cursor-pointer"
        >
          <ShoppingBasket size={16} />
          Generate shopping list
        </button>
      )}

      {generating && (
        <div className="flex items-center justify-center gap-2 rounded-3xl bg-surface px-4 py-8 text-sm font-medium text-ink-soft shadow-sm shadow-ink/5">
          <Spinner /> Building your list...
        </div>
      )}

      {error && (
        <div className="mt-3">
          <InlineError message={error} onRetry={onGenerate} />
        </div>
      )}

      {plannedCount > 0 && shoppingList && !generating && (
        <div>
          {stale && (
            <button
              type="button"
              onClick={onGenerate}
              className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-coral underline underline-offset-2 cursor-pointer"
            >
              <RefreshCw size={12} />
              Meals changed since this list was built — Rebuild it
            </button>
          )}

          {toBuyByCategory.size === 0 && haveItems.length === 0 && (
            <p className="rounded-3xl bg-surface p-6 text-center text-sm text-ink-soft shadow-sm shadow-ink/5">
              Nothing on the list.
            </p>
          )}

          <div className="space-y-5">
            {Array.from(toBuyByCategory.entries()).map(([category, items]) => (
              <div key={category} className="overflow-hidden rounded-3xl bg-surface shadow-sm shadow-ink/5">
                <h3 className="px-5 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-widest text-mint">
                  {category}
                </h3>
                <ul>
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <ShoppingItemRow key={item.id} item={item} onToggle={onToggleHave} />
                    ))}
                  </AnimatePresence>
                </ul>
              </div>
            ))}
          </div>

          {haveItems.length > 0 && (
            <div className="mt-6 rounded-3xl bg-surface shadow-sm shadow-ink/5">
              <button
                type="button"
                onClick={() => setHaveOpen((v) => !v)}
                className="flex w-full items-center gap-1.5 px-5 py-4 text-xs font-semibold uppercase tracking-widest text-ink-soft transition-colors hover:text-ink cursor-pointer"
              >
                {haveOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Already have ({haveItems.length})
              </button>
              <AnimatePresence initial={false}>
                {haveOpen && (
                  <motion.ul
                    key="have-list"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    {haveItems.map((item) => (
                      <ShoppingItemRow key={item.id} item={item} onToggle={onToggleHave} />
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShoppingItemRow({ item, onToggle }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="border-t border-steel/60 first:border-t-0"
    >
      <label className="flex cursor-pointer items-center gap-3 px-5 py-3">
        <input
          type="checkbox"
          checked={item.have}
          onChange={() => onToggle(item.id)}
          className="h-[18px] w-[18px] shrink-0 accent-mint"
        />
        <span
          className={`flex-1 text-sm ${item.have ? "text-ink-soft/70 line-through" : "text-ink"}`}
        >
          {item.name}
        </span>
        <span className="shrink-0 text-xs font-medium text-ink-soft">
          {item.quantity}
        </span>
      </label>
    </motion.li>
  );
}
