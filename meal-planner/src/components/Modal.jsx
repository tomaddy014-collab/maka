import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: "easeIn" } },
};

const panelVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 380, damping: 32 },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.98,
    transition: { duration: 0.16, ease: "easeIn" },
  },
};

export default function Modal({ onClose, title, eyebrow, children, size = "md" }) {
  const panelRef = useRef(null);

  useEffect(() => {
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
  }, [onClose]);

  const maxWidth = size === "lg" ? "md:max-w-2xl" : "md:max-w-lg";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-0 backdrop-blur-sm md:items-center md:p-4"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        variants={panelVariants}
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface md:max-h-[85vh] md:rounded-3xl ${maxWidth} shadow-2xl shadow-ink/10 focus:outline-none`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-steel/60 px-6 py-5">
          <div>
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-widest text-mint">
                {eyebrow}
              </p>
            )}
            <h2 className="text-xl font-semibold text-ink">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full bg-surface-soft p-2 text-ink-soft transition-colors hover:bg-steel/60 hover:text-ink cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}
