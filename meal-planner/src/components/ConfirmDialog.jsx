import { AnimatePresence } from "framer-motion";
import Modal from "./Modal.jsx";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}) {
  return (
    <AnimatePresence>
      {open && (
        <Modal onClose={onCancel} title={title} eyebrow="Are you sure?">
          <p className="text-sm text-ink-soft">{message}</p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.97] cursor-pointer"
            >
              {confirmLabel}
            </button>
          </div>
        </Modal>
      )}
    </AnimatePresence>
  );
}
