export function initials(name: string | null): string {
  if (!name) return "??";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

/** Prezzo in EUR, formato italiano. maxDigits per casi con centesimi fini (es. costi AI). */
export function formatPrice(n: number, maxDigits = 2): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: maxDigits }).format(n);
}

/** Raggruppa un array per chiave, preservando l'ordine di prima apparizione. */
export function groupBy<T>(items: T[], key: (t: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  items.forEach((i) => { const k = key(i); if (!map.has(k)) map.set(k, []); map.get(k)!.push(i); });
  return [...map.entries()];
}
