/** Riscrive un URL /images/... verso l'endpoint di ridimensionamento WebP
 *  (/api/img). Per src non-/images (blob, placeholder, ecc.) restituisce l'originale. */
export function thumbUrl(src: string | null | undefined, w?: number): string {
  if (!src) return src ?? "";
  if (!w || !src.startsWith("/images/")) return src;
  const rel = src.slice("/images/".length);
  return `/api/img?p=${encodeURIComponent(rel)}&w=${w}`;
}
