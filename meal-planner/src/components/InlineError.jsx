import { AlertTriangle, RotateCcw } from "lucide-react";

export default function InlineError({ message, onRetry }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl bg-coral-tint px-4 py-3 text-sm text-ink">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-coral" />
      <div className="flex-1">
        <p>{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-coral underline underline-offset-2 cursor-pointer"
          >
            <RotateCcw size={12} /> Try again
          </button>
        )}
      </div>
    </div>
  );
}
