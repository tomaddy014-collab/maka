import { AlertTriangle, RotateCcw } from "lucide-react";

export default function InlineError({ message, onRetry }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-rust/40 bg-rust/10 px-3 py-2.5 text-sm text-paper">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rust" />
      <div className="flex-1">
        <p>{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1.5 flex items-center gap-1.5 font-mono text-xs text-rust underline underline-offset-2 cursor-pointer"
          >
            <RotateCcw size={12} /> Try again
          </button>
        )}
      </div>
    </div>
  );
}
