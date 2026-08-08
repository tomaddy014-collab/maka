import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, eyebrow, children, size = "md" }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const previouslyFocused = document.activeElement;
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxWidth = size === "lg" ? "md:max-w-2xl" : "md:max-w-lg";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`animate-sheet-up flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-charcoal-light md:max-h-[85vh] md:rounded-2xl ${maxWidth} shadow-2xl focus:outline-none`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-paper/10 px-5 py-4">
          <div>
            {eyebrow && (
              <p className="font-mono text-[11px] uppercase tracking-widest text-sage">
                {eyebrow}
              </p>
            )}
            <h2 className="font-display text-xl text-paper">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-2 text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
