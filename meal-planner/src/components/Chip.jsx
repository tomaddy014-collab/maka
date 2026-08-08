export default function Chip({ children, tone = "sage" }) {
  const toneClasses =
    tone === "rust"
      ? "bg-rust/15 text-rust border-rust/30"
      : "bg-sage/15 text-sage border-sage/30";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide ${toneClasses}`}
    >
      {children}
    </span>
  );
}
