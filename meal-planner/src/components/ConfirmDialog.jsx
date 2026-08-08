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
    <Modal open={open} onClose={onCancel} title={title} eyebrow="Are you sure?">
      <p className="text-sm text-paper/80">{message}</p>
      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 font-mono text-sm text-paper/70 transition-colors hover:text-paper cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-rust px-4 py-2 font-mono text-sm font-semibold text-paper transition-opacity hover:opacity-90 cursor-pointer"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
