"use client";

import { imgStyle } from "../../lib/img-css";

/** UNICO punto di rendering di un'immagine posizionata (object-fit/position/
 *  transform impostati nel dettaglio articolo). Usato ovunque serva "posizionare"
 *  un'immagine — editor admin, card catalogo, galleria — così il risultato è
 *  identico per costruzione: stesso contenitore, stesso <img>, stesso css.
 *
 *  `aspect` è la forma del riquadro (4/3 per card e galleria, 1 per i quadrati):
 *  DEVE essere la stessa nell'editor e dove l'immagine viene mostrata, altrimenti
 *  `object-position` ritaglia in modo diverso. */
export default function PositionedImage({
  src,
  css,
  aspect = 4 / 3,
  alt = "",
  className,
  style,
  onClick,
  children,
}: {
  src?: string | null;
  /** stringa css salvata: "object-fit:cover;object-position:X% Y%;transform:..." */
  css?: string | null;
  aspect?: number;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  /** overlay opzionale sopra l'immagine (es. il pallino di posizione nell'editor) */
  children?: React.ReactNode;
}) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{ aspectRatio: String(aspect), overflow: "hidden", position: "relative", ...style }}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", ...imgStyle(css) }}
        />
      )}
      {children}
    </div>
  );
}
