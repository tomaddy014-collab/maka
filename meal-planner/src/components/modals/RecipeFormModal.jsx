import Modal from "../Modal.jsx";
import RecipeForm from "../RecipeForm.jsx";

export default function RecipeFormModal({ day, slot, recipe, onSubmit, onClose }) {
  return (
    <Modal open onClose={onClose} eyebrow={`${day} · ${slot}`} title="Edit recipe" size="lg">
      <RecipeForm initial={recipe} submitLabel="Save changes" onSubmit={onSubmit} onCancel={onClose} />
    </Modal>
  );
}
