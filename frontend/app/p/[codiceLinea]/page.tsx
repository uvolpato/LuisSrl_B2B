"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PositionedImage from "../../../components/common/PositionedImage";
import "../p.css";

interface DimEntry {
  codice: string;
  descrizione: string;
  valore: number;
}

interface Variante {
  codice: string;
  descrizione: string;
  dimensioni: Record<string, DimEntry> | null;
  stato: string;
}

interface Immagine {
  id: number;
  url: string;
  ordinamento: number;
  copertina: boolean;
  tipo: string;
  inGalleria: boolean;
  css: string;
}

interface Articolo {
  id: string;
  codiceLinea: string;
  nome: string;
  colore: string | null;
  coloreRgb: string | null;
  famiglia: { codice: string; nome: string };
  variantiCount: number;
  descrizione: string | null;
  descrizioneAI: string | null;
  varianti: Variante[];
  immagini: Immagine[];
}

/**
 * Anteprima pubblica della scheda articolo (link Condividi): descrizioni e
 * varianti visibili a chiunque, MA senza prezzi, disponibilità e azioni.
 * Se chi apre il link è già un cliente loggato viene rimandato alla scheda
 * completa. Bloccabile dal backend (PUBLIC_ARTICLE_SHARING=false): l'endpoint
 * risponde 404 e qui si mostra "Anteprima non disponibile".
 */
export default function AnteprimaArticoloPage({ params }: { params: Promise<{ codiceLinea: string }> }) {
  const router = useRouter();
  const [paramsResolved, setParamsResolved] = useState<{ codiceLinea: string } | null>(null);
  useEffect(() => {
    params.then(setParamsResolved);
  }, [params]);

  const codiceLinea = paramsResolved?.codiceLinea;

  const [articolo, setArticolo] = useState<Articolo | null>(null);
  const [stato, setStato] = useState<"loading" | "pronto" | "nonDisponibile">("loading");
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);

  useEffect(() => {
    if (!codiceLinea) return;
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (cancelled) return;
        if (me?.user?.userType === "customer") {
          router.replace(`/area/catalogo/${encodeURIComponent(codiceLinea)}`);
          return;
        }
        return fetch(`/api/catalogo/pubblico/${encodeURIComponent(codiceLinea)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (cancelled) return;
            if (d) {
              setArticolo(d);
              setStato("pronto");
            } else {
              setStato("nonDisponibile");
            }
          });
      })
      .catch(() => {
        if (!cancelled) setStato("nonDisponibile");
      });
    return () => {
      cancelled = true;
    };
  }, [codiceLinea, router]);

  const galleryImages = useMemo(() => {
    if (!articolo) return [];
    return articolo.immagini.filter((i) => i.inGalleria).sort((a, b) => a.ordinamento - b.ordinamento);
  }, [articolo]);

  const varianti = useMemo(() => {
    if (!articolo) return [];
    return articolo.varianti.sort((a, b) => a.codice.localeCompare(b.codice));
  }, [articolo]);

  const dimKeys = useMemo(() => {
    const keys = new Set<string>();
    varianti.forEach((v) => {
      if (v.dimensioni) Object.keys(v.dimensioni).forEach((k) => keys.add(k));
    });
    const order = ["diametro", "altezza", "larghezza", "profondita"];
    return [...keys].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [varianti]);

  return (
    <div className="catalogo-page scheda-prodotto">
      <main id="content">
        <div className="anteprima-banner">
          <span>Anteprima per clienti: prezzi e disponibilità sono visibili dopo l&apos;accesso.</span>
          <Link className="btn btn-primary btn-sm" href="/login">Accedi</Link>
        </div>

        {stato === "loading" && (
          <div className="container" style={{ paddingBlock: 48, textAlign: "center", color: "var(--muted)" }}>
            Caricamento…
          </div>
        )}

        {stato === "nonDisponibile" && (
          <div className="container" style={{ paddingBlock: 48, textAlign: "center", color: "var(--muted)" }}>
            Anteprima non disponibile.
            <div style={{ marginTop: 12 }}>
              <Link className="btn btn-primary btn-sm" href="/login">Accedi all&apos;area clienti</Link>
            </div>
          </div>
        )}

        {stato === "pronto" && articolo && (
          <>
            <div className="product-layout">
              <div className="product-left">
                <div className="gallery-wrapper">
                  <PositionedImage
                    className="gallery-main"
                    src={galleryImages[selectedImgIdx]?.url}
                    css={galleryImages[selectedImgIdx]?.css}
                    aspect={4 / 3}
                    alt={articolo.nome}
                    thumbWidth={800}
                  >
                    {galleryImages[selectedImgIdx]?.tipo === "AI" && (
                      <span className="ai-badge" title="Immagine generata con AI">AI</span>
                    )}
                  </PositionedImage>
                  <div className="gallery-thumbs">
                    {galleryImages.map((img, i) => (
                      <PositionedImage
                        key={img.id}
                        className={`thumb ${i === selectedImgIdx ? "active" : ""}`}
                        src={img.url}
                        css={img.css}
                        aspect={1}
                        alt={`Thumb ${i + 1}`}
                        thumbWidth={200}
                        onClick={() => setSelectedImgIdx(i)}
                      >
                        {img.tipo === "AI" && <span className="ai-badge ai-badge-sm" title="Immagine generata con AI">AI</span>}
                      </PositionedImage>
                    ))}
                  </div>
                </div>
              </div>

              <div className="product-center">
                <div>
                  <p className="eyebrow" style={{ marginBottom: 8 }}>{articolo.famiglia.nome}</p>
                  <h1>{articolo.nome}</h1>
                  {articolo.colore && (
                    <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>
                      Colore: <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", background: articolo.coloreRgb || articolo.colore, border: "1px solid var(--border)", verticalAlign: "middle" }} />
                        {articolo.colore}
                      </span>
                    </p>
                  )}
                </div>

                <div className="product-desc-block">
                  <h3>Descrizione</h3>
                  <p>{articolo.descrizione || "Descrizione non disponibile."}</p>
                </div>

                <div className="product-desc-block">
                  <h3>Caratteristiche</h3>
                  <div className="product-features">
                    <div className="feat"><strong>Famiglia:</strong> {articolo.famiglia.nome}</div>
                    <div className="feat"><strong>Varianti:</strong> {articolo.variantiCount}</div>
                    {articolo.colore && <div className="feat"><strong>Colore:</strong> {articolo.colore}</div>}
                    <div className="feat"><strong>Codice:</strong> {articolo.codiceLinea}</div>
                  </div>
                </div>

                {articolo.descrizioneAI && (
                  <div className="product-desc-block">
                    <h3>Punti chiave</h3>
                    <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
                      {articolo.descrizioneAI.split("\n").filter(Boolean).map((line, i) => (
                        <p key={i} style={{ margin: "0 0 4px" }}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="preview-box">
                <h3>Anteprima</h3>
                <p>Prezzi, disponibilità e ordini sono riservati ai clienti registrati.</p>
                <Link className="btn btn-primary" href="/login">Accedi all&apos;area clienti</Link>
              </div>
            </div>

            <section className="variant-grid-section">
              <div className="container">
                <h2>Griglia d&apos;ordine varianti</h2>
                <div className="variant-table-scroll">
                  <table className="variant-table">
                    <colgroup>
                      <col className="col-cod" />
                      <col className="col-desc" />
                      <col className="col-dim" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Cod.</th>
                        <th>Descrizione</th>
                        <th>Dimensioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {varianti.map((v) => (
                        <tr key={v.codice}>
                          <td><span className="code-cell">{v.codice}</span></td>
                          <td style={{ fontSize: 13, color: "var(--muted)" }}>{v.descrizione || "—"}</td>
                          <td>
                            {dimKeys.map((key) => {
                              const e = v.dimensioni?.[key];
                              if (!e) return "";
                              const prefix = key === "diametro" ? "Ø" : key === "altezza" ? "H" : "";
                              return `${prefix}${e.valore} `;
                            }).join("").trim()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
