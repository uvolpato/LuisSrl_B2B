/** Converte la stringa css salvata sull'immagine (EditImageModal admin:
 *  object-fit / object-position / transform) in stile inline React,
 *  così il posizionamento impostato nel dettaglio articolo vale ovunque. */
export function imgStyle(css: string | null | undefined): React.CSSProperties {
  if (!css) return {};
  const parts: Record<string, string> = {};
  css.split(";").filter(Boolean).forEach((p) => {
    const [k, v] = p.split(":");
    if (k && v) parts[k.trim()] = v.trim();
  });
  const s: React.CSSProperties = {};
  if (parts["object-fit"]) s.objectFit = parts["object-fit"] as React.CSSProperties["objectFit"];
  if (parts["object-position"]) s.objectPosition = parts["object-position"];
  if (parts.transform) s.transform = parts.transform;
  return s;
}
