"use client";

import { parseImgCss } from "../../lib/img-css";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  css?: string | null;
  aspect?: number;
  alt?: string;
  imgStyle?: React.CSSProperties;
}

/** UNICO punto di rendering di un'immagine posizionata.
 *
 *  3 layer:
 *    1) Contenitore esterno — fisso, overflow:hidden, aspect-ratio, className
 *    2) Wrapper intermedio — translate(X-50%, Y-50%) per il posizionamento
 *    3) <img> — object-fit + object-position:50%50% + transform(scale+rotate)
 *
 *  Il posizionamento via translate funziona sempre, indipendentemente da
 *  object-fit (cosa che object-position non garantisce con "contain").
 *
 *  Le props extra (draggable, onDragStart, onMouseDown, …) vengono passate
 *  al contenitore esterno. */
export default function PositionedImage({
  src,
  css,
  aspect = 4 / 3,
  alt = "",
  className,
  style,
  imgStyle: extraImgStyle,
  children,
  ...rest
}: Props) {
  const p = parseImgCss(css);
  const translateX = p.posX - 50;
  const translateY = p.posY - 50;
  const scale = p.zoom !== 0 || p.rotation !== 0
    ? `scale(${1 + p.zoom / 100}) rotate(${p.rotation}deg)`
    : undefined;

  return (
    <div
      className={className}
      style={{ aspectRatio: String(aspect), overflow: "hidden", position: "relative", ...style }}
      {...rest}
    >
      {src && (
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `translate(${translateX}%, ${translateY}%)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: p.objectFit as React.CSSProperties["objectFit"],
              objectPosition: "50% 50%",
              ...(scale ? { transform: scale } : {}),
              ...extraImgStyle,
            }}
          />
        </div>
      )}
      {children}
    </div>
  );
}
