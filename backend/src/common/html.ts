/** I dati arrivano dal DB e finiscono in HTML: vanno neutralizzati. */
export function esc(s: string | null | undefined): string {
  // Prima le sostituzioni erano no-op ('&' -> '&'): nessun escape effettivo.
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
