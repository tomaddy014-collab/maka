import { useState } from "react";
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
    <div className="mx-auto max-w-2xl px-4 py-4">
      <div className="mb-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-sage">
          {weekDateRangeLabel(weekKey)}
        </p>
        <h2 className="font-display text-2xl text-paper">Shopping list</h2>
      </div>

      {plannedCount === 0 && (
        <p className="rounded-xl bg-charcoal-light p-6 text-center font-mono text-sm text-paper/50">
          Plan at least one meal this week to build a shopping list.
        </p>
      )}

      {plannedCount > 0 && !shoppingList && !generating && (
        <button
          type="button"
          onClick={onGenerate}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-rust px-4 py-3 font-mono text-sm font-semibold text-paper transition-opacity hover:opacity-90 cursor-pointer"
        >
          <ShoppingBasket size={16} />
          Generate shopping list
        </button>
      )}

      {generating && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-charcoal-light px-4 py-6 font-mono text-sm text-paper/70">
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
              className="mb-3 flex items-center gap-1.5 font-mono text-xs text-rust underline underline-offset-2 cursor-pointer"
            >
              <RefreshCw size={12} />
              Meals changed since this list was built — Rebuild it
            </button>
          )}

          {toBuyByCategory.size === 0 && haveItems.length === 0 && (
            <p className="rounded-xl bg-charcoal-light p-6 text-center font-mono text-sm text-paper/50">
              Nothing on the list.
            </p>
          )}

          <div className="space-y-5">
            {Array.from(toBuyByCategory.entries()).map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-sage">
                  {category}
                </h3>
                <ul className="space-y-1.5">
                  {items.map((item) => (
                    <ShoppingItemRow key={item.id} item={item} onToggle={onToggleHave} />
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {haveItems.length > 0 && (
            <div className="mt-6 border-t border-paper/10 pt-3">
              <button
                type="button"
                onClick={() => setHaveOpen((v) => !v)}
                className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-paper/50 hover:text-paper/80 cursor-pointer"
              >
                {haveOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Already have ({haveItems.length})
              </button>
              {haveOpen && (
                <ul className="mt-2 space-y-1.5">
                  {haveItems.map((item) => (
                    <ShoppingItemRow key={item.id} item={item} onToggle={onToggleHave} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShoppingItemRow({ item, onToggle }) {
  return (
    <li>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-charcoal-light px-3 py-2">
        <input
          type="checkbox"
          checked={item.have}
          onChange={() => onToggle(item.id)}
          className="h-4 w-4 shrink-0 accent-rust"
        />
        <span
          className={`flex-1 text-sm ${item.have ? "text-paper/40 line-through" : "text-paper"}`}
        >
          {item.name}
        </span>
        <span className="shrink-0 font-mono text-xs text-paper/50">
          {item.quantity}
        </span>
      </label>
    </li>
  );
}
