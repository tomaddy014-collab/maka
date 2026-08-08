export default function Chip({ children, tone = "mint" }) {
  const toneClasses =
    tone === "coral"
      ? "bg-coral-tint text-coral"
      : "bg-mint-tint text-mint";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${toneClasses}`}
    >
      {children}
    </span>
  );
}
