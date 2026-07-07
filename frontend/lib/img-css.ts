/** Converte la stringa css salvata sull'immagine (EditImageModal admin:
 *  object-fit / object-position / transform) in stile inline React, VERBATIM.
 *  Nessun ricalcolo: l'anteprima admin e la vista cliente applicano la stessa
 *  identica stringa, quindi mostrano lo stesso identico risultato. Se una
 *  rotazione lascia scoperti gli angoli, si vede uguale in entrambi e si
 *  corregge con lo zoom nell'editor (WYSIWYG). */
export function imgStyle(css: string | null | undefined): React.CSSProperties {
  if (!css) return {};
  const s: React.CSSProperties = {};
  css.split(";").filter(Boolean).forEach((p) => {
    const i = p.indexOf(":");
    if (i < 0) return;
    const k = p.slice(0, i).trim();
    const v = p.slice(i + 1).trim();
    if (k === "object-fit") s.objectFit = v as React.CSSProperties["objectFit"];
    else if (k === "object-position") s.objectPosition = v;
    else if (k === "transform") s.transform = v;
  });
  return s;
}
