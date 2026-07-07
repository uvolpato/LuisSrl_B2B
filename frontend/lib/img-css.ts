/** Converte la stringa css salvata sull'immagine in stile inline React.
 *  object-fit, object-position e transform vanno tutti sull'img. */
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

/** Parsing strutturato del css immagine per posizionamento via wrapper. */
export function parseImgCss(css: string | null | undefined): {
  objectFit: string;
  posX: number;
  posY: number;
  zoom: number;
  rotation: number;
} {
  const def = { objectFit: "cover" as const, posX: 50, posY: 50, zoom: 0, rotation: 0 };
  if (!css) return def;
  const parts: Record<string, string> = {};
  css.split(";").filter(Boolean).forEach((p) => {
    const i = p.indexOf(":");
    if (i < 0) return;
    parts[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  });
  const fit = parts["object-fit"] || def.objectFit;
  const pos = parts["object-position"] || "50% 50%";
  const t = parts.transform || "";
  const sm = t.match(/scale\(([^)]+)\)/);
  const rm = t.match(/rotate\(([^)]+)\)/);
  const zoom = sm ? (parseFloat(sm[1]) - 1) * 100 : 0;
  const rotation = rm ? parseFloat(rm[1]) : 0;
  const [px, py] = pos.split(/\s+/).map((v) => parseFloat(v));
  return { objectFit: fit, posX: px || 50, posY: py || 50, zoom, rotation };
}
