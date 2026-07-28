/** Pulsantino "×" per svuotare un campo di ricerca. Il posizionamento lo passa il chiamante via style. */
export default function ClearButton({
  onClear, style, title = "Cancella",
}: {
  onClear: () => void;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={title}
      title={title}
      style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, display: "grid", placeItems: "center", ...style }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    </button>
  );
}
