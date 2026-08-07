"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../../../lib/api";
import { ApiError } from "../../../lib/api";
import ComboboxField from "../ComboboxField";
import type { ComboboxOption } from "../ComboboxField";
import Modal from "../../common/Modal";
import DataTip from "../../common/DataTip";
import Hint from "../../common/Hint";
import { useConfirm } from "../../common/ConfirmProvider";
import type { Tariffa } from "../../../lib/spese-spedizione";
import {
  resolveTariffa, pctOf, calcFee, destName, destTitle, describeTariffa,
  sortedDest, fmtEur, fmtPct, currentRanges, statoLabel,
  NAZIONI_ORDER, REGIONI_IT, ZONE_KEYS, euCount,
  isZona, NAZIONI,
} from "../../../lib/spese-spedizione";

const PAGE_SIZE = 15;
const SCOGLIONI_W_KEY = "spese-scaglioni-w";

export default function SpeseSpedizioneSection() {
  const [tariffe, setTariffe] = useState<Tariffa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStato, setFilterStato] = useState("tutti");
  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Tariffa | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcMode, setCalcMode] = useState<"sim" | "prev">("sim");
  const [calcPrevTariffa, setCalcPrevTariffa] = useState<Tariffa | null>(null);
  const [guidaOpen, setGuidaOpen] = useState(false);
  const [scaglioniW, setScaglioniW] = useState(() => {
    if (typeof window !== "undefined") return Number(localStorage.getItem(SCOGLIONI_W_KEY)) || 220;
    return 220;
  });
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    api.get<{ data: Tariffa[] }>("/api/admin/tariffe-spedizione")
      .then(r => setTariffe(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = (() => {
    const base = sortedDest(tariffe).filter(d => {
      if (filterStato !== "tutti" && d.stato !== filterStato) return false;
      if (!search) return true;
      return destName(d).toLowerCase().includes(search.toLowerCase());
    });
    if (!sortKey) return base;
    return [...base].sort((a, b) => {
      let va: string | number, vb: string | number;
      if (sortKey === "destinazione") { va = destName(a); vb = destName(b); }
      else if (sortKey === "base") { va = a.basePercent; vb = b.basePercent; }
      else if (sortKey === "soglia") { va = a.sogliaImporto ?? 0; vb = b.sogliaImporto ?? 0; }
      else return 0;
      const cmp = typeof va === "string" ? va.localeCompare(vb as string, "it") : va - (vb as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  })();

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, filterStato]);

  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  // Colonna ridimensionabile
  const resizing = useRef(false);
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!resizing.current) return;
      const w = Math.max(140, e.clientX - (document.querySelector(".data-table table")?.getBoundingClientRect().left ?? 0) - (document.querySelector("thead th:first-child")?.getBoundingClientRect().width ?? 0) - 100);
      setScaglioniW(w);
    }
    function onUp() { resizing.current = false; document.body.style.cursor = ""; document.body.style.userSelect = ""; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem(SCOGLIONI_W_KEY, String(scaglioniW)); }, [scaglioniW]);

  function refresh() {
    api.get<{ data: Tariffa[] }>("/api/admin/tariffe-spedizione")
      .then(r => setTariffe(r.data))
      .catch(() => {});
  }

  function openEdit(t?: Tariffa) {
    setEditTarget(t ?? null);
    setEditOpen(true);
  }

  async function toggleStato(t: Tariffa) {
    if (t.stato === "configura") return;
    await api.patch(`/api/admin/tariffe-spedizione/${t.id}/stato`);
    await refresh();
  }

  async function duplicate(t: Tariffa) {
    await api.post("/api/admin/tariffe-spedizione", {
      nazione: t.nazione,
      regione: t.regione ?? null,
      basePercent: t.basePercent,
      stato: "configura",
      sogliaImporto: t.sogliaImporto ?? null,
      minimoImporto: t.minimoImporto ?? null,
      ranges: t.ranges ?? [],
    });
    await refresh();
  }

  async function onDeleteTariffa(id: number) {
    await api.del(`/api/admin/tariffe-spedizione/${id}`);
    await refresh();
  }

  const meta = `${tariffe.length} tariffe · ${tariffe.filter(d => isZona(d.nazione)).length} zone · ${tariffe.filter(d => !isZona(d.nazione) && !d.regione).length} nazioni · ${tariffe.filter(d => d.regione !== null).length} eccezioni regionali · ${tariffe.filter(d => d.stato === "ok").length} configurate · ${tariffe.filter(d => d.stato === "configura").length} da configurare · ${tariffe.filter(d => d.stato === "pausa").length} in pausa`;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="admin-top" style={{ position: "sticky", top: 0, zIndex: 10 }}>
        <h1>Spese di spedizione</h1>
        <div className="top-actions">
          <div className="admin-search">
            <span className="search-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            </span>
            <input type="text" placeholder="Cerca destinazione…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input filter-select" value={filterStato} onChange={e => setFilterStato(e.target.value)}>
            <option value="tutti">Tutti gli stati</option>
            <option value="ok">Configurate</option>
            <option value="pausa">In pausa</option>
            <option value="configura">Da configurare</option>
          </select>
          <div className="action-buttons">
            <button className="btn btn-secondary" onClick={() => { setCalcMode("sim"); setCalcPrevTariffa(null); setCalcOpen(true); }}>Simulatore di costo</button>
            <button className="btn btn-primary" onClick={() => openEdit()}>Crea nuovo</button>
          </div>
        </div>
      </div>

      <div className="admin-content">
        <div className="content-header">
          <span className="meta">{meta}</span>
          <span style={{ flex: 1 }} />
          <span className="hint" tabIndex={0} onClick={() => setGuidaOpen(true)} style={{ cursor: "pointer" }}>?
            <span className="hint-tip">Guida all&apos;uso delle tariffe di spedizione</span>
          </span>
        </div>

        <div className="data-table">
          <div className="data-table-scroll">
            <table>
              <colgroup>
                <col style={{ width: 300 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: scaglioniW, minWidth: 140 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 96 }} />
              </colgroup>
              <thead>
                <tr>
                  <th className={sortKey === "destinazione" ? "sorted" : ""} onClick={() => handleSort("destinazione")} style={{ cursor: "pointer" }}>
                    Destinazione {sortKey === "destinazione" && <span className="sort-arrow">{sortDir === "asc" ? "▲" : "▼"}</span>}
                  </th>
                  <th className={`num${sortKey === "base" ? " sorted" : ""}`} onClick={() => handleSort("base")} style={{ cursor: "pointer" }}>
                    % base {sortKey === "base" && <span className="sort-arrow">{sortDir === "asc" ? "▲" : "▼"}</span>}
                  </th>
                  <th className="col-resizable">
                    Scaglioni sconto medio
                    <span
                      className="th-resize"
                      style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 12, cursor: "col-resize", zIndex: 6 }}
                      onMouseDown={e => { e.preventDefault(); resizing.current = true; document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }}
                    />
                  </th>
                  <th className={`num${sortKey === "soglia" ? " sorted" : ""}`} onClick={() => handleSort("soglia")} style={{ cursor: "pointer" }}>
                    Soglia gratuita {sortKey === "soglia" && <span className="sort-arrow">{sortDir === "asc" ? "▲" : "▼"}</span>}
                  </th>
                  <th className="num">Tariffa min.</th>
                  <th style={{ textAlign: "right" }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(d => {
                  const ranges = currentRanges(d.ranges) as number[][];
                  return (
                    <tr key={d.id}>
                      <td>
                        <div className="cell-entity">
                          <DataTip tip={statoLabel[d.stato] ?? d.stato}>
                            <span className={`cell-dot ${d.stato}`} />
                          </DataTip>
                          <div className="cell-entity-text">
                            <span className="cell-entity-title">{destName(d)}</span>
                            <span className="cell-entity-sub mono">{destTitle(d)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="num">{fmtPct(d.basePercent)}</td>
                      <td>
                        {ranges.length === 0 ? (
                          <span className="cell-empty">—</span>
                        ) : (
                          (() => {
                            const maxChips = scaglioniW < 180 ? 2 : 3;
                            const shown = ranges.slice(0, maxChips);
                            const rest = ranges.slice(maxChips);
                            return (
                              <span className="chip-set">
                                {shown.map((rg, i) => (
                                  <span key={i} className="chip">{rg[0]}–{rg[1] === null ? "oltre" : rg[1]}% → {fmtPct(rg[2])}</span>
                                ))}
                                {rest.length > 0 && (
                                  <span className="chip more" title={rest.map(rg => `${rg[0]}–${rg[1] === null ? "oltre" : rg[1]}% → ${fmtPct(rg[2])}`).join(" · ")}>
                                    +{rest.length}
                                  </span>
                                )}
                              </span>
                            );
                          })()
                        )}
                      </td>
                      <td className="num">{d.sogliaImporto != null ? fmtEur(d.sogliaImporto) : <span className="cell-empty">—</span>}</td>
                      <td className="num">{d.minimoImporto != null ? fmtEur(d.minimoImporto) : <span className="cell-empty">—</span>}</td>
                      <td className="data-table-actions">
                        <DataTip tip="Modifica">
                          <button className="row-action" onClick={() => openEdit(d)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                        </DataTip>
                        <DataTip tip="Duplica">
                          <button className="row-action" onClick={() => duplicate(d)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          </button>
                        </DataTip>
                        {d.stato !== "configura" && (
                          <DataTip tip={d.stato === "ok" ? "Metti in pausa" : "Riprendi"}>
                            <button className="row-action" onClick={() => toggleStato(d)}>
                              {d.stato === "ok" ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                              )}
                            </button>
                          </DataTip>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {paged.length === 0 && (
                  <tr><td colSpan={5} className="data-table-empty">Nessuna tariffa trovata</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="data-table-footer">
            <span>{filtered.length > 0 ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} di ${filtered.length}` : "—"}</span>
            <div className="pager">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span className="pager-current">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </div>
      </div>
      </div>
      {editOpen && <TariffaEditor
        tariffa={editTarget}
        allTariffe={tariffe}
        onClose={() => setEditOpen(false)}
        onSaved={() => { setEditOpen(false); refresh(); }}
        onCalcPreview={(t) => { setCalcMode("prev"); setCalcPrevTariffa(t); setCalcOpen(true); }}
        onDelete={onDeleteTariffa}
      />}

      {guidaOpen && <GuidaModal onClose={() => setGuidaOpen(false)} />}

      {calcOpen && <TariffaCalcModal
        mode={calcMode}
        prevTariffa={calcPrevTariffa}
        allTariffe={tariffe}
        onClose={() => setCalcOpen(false)}
      />}
    </div>
  );
}

/* ── Editor modale ── */
function TariffaEditor({ tariffa, allTariffe, onClose, onSaved, onCalcPreview, onDelete }: {
  tariffa: Tariffa | null;
  allTariffe: Tariffa[];
  onClose: () => void;
  onSaved: () => void;
  onCalcPreview: (t: Tariffa) => void;
  onDelete: (id: number) => void;
}) {
  const isNew = !tariffa;
  const [livello, setLivello] = useState(tariffa ? (tariffa.regione ? "regione" : isZona(tariffa.nazione) ? tariffa.nazione : "nazione") : "nazione");
  const [nazione, setNazione] = useState(tariffa?.nazione ?? "IT");
  const [regione, setRegione] = useState(tariffa?.regione ?? "");
  const [base, setBase] = useState(tariffa?.basePercent ?? 3);
  const [stato, setStato] = useState(tariffa?.stato ?? "configura");
  const [soglia, setSoglia] = useState(tariffa?.sogliaImporto ?? 0);
  const [minimo, setMinimo] = useState(tariffa?.minimoImporto ?? 0);
  const [ranges, setRanges] = useState<(number | null)[][]>(() => (tariffa?.ranges ?? []).map(r => [r[0] ?? 0, r[1] ?? null, r[2] ?? 0] as (number | null)[]));
  const confirm = useConfirm();
  const [error, setError] = useState("");

  const nazioniOpts: ComboboxOption[] = NAZIONI_ORDER.map(k => ({ value: k, label: NAZIONI[k].n, meta: NAZIONI[k].z === 'EU' ? 'EU' : undefined }));
  const regioniOpts: ComboboxOption[] = REGIONI_IT.map(r => ({ value: r, label: r }));

  const desc = !isNew ? describeTariffa(tariffa!) : null;

  function addRange() {
    if (ranges.length === 0) {
      setRanges([[null, 5, null]]);
      return;
    }
    const newRanges: (number | null)[][] = ranges.map(r => [...r] as (number | null)[]);
    const lastIdx = newRanges.length - 1;
    if (newRanges[lastIdx][1] === null) {
      const prev = lastIdx > 0 ? (newRanges[lastIdx - 1][1] ?? 0) : 0;
      newRanges[lastIdx] = [prev as number, (prev as number) + 5, newRanges[lastIdx][2] ?? null];
      newRanges.push([(prev as number) + 5, null, null]);
    } else {
      newRanges.push([newRanges[lastIdx][1] ?? 0, null, null]);
    }
    setRanges(newRanges);
  }

  function removeRange(i: number) {
    if (ranges.length <= 1) { setRanges([]); return; }
    const newRanges: (number | null)[][] = ranges.filter((_r, idx) => idx !== i).map(r => [...r] as (number | null)[]);
    if (i === ranges.length - 1 && newRanges.length > 0) {
      newRanges[newRanges.length - 1] = [newRanges[newRanges.length - 1][0] ?? 0, null, newRanges[newRanges.length - 1][2] ?? null];
    }
    setRanges(newRanges);
  }

  function updateRange(i: number, field: 1 | 2, val: string) {
    const n = val === "" ? null : Number(val);
    setRanges(prev => prev.map((r, idx) => idx === i ? [r[0], field === 1 ? n : r[1], field === 2 ? n : r[2]] as (number | null)[] : r));
  }

  async function save() {
    setError("");
    const rng = ranges.filter(r => r[2] != null).map(r => [r[0] ?? 0, r[1] ?? null, r[2] ?? 0] as number[]);
    try {
      if (isNew) {
        await api.post("/api/admin/tariffe-spedizione", {
          nazione: livello === "regione" ? "IT" : livello === "nazione" ? nazione : livello,
          regione: livello === "regione" ? regione || null : null,
          basePercent: base,
          stato,
          sogliaImporto: soglia || null,
          minimoImporto: minimo || null,
          ranges: rng,
        });
      } else {
        await api.put(`/api/admin/tariffe-spedizione/${tariffa!.id}`, {
          basePercent: base,
          stato,
          sogliaImporto: soglia || null,
          minimoImporto: minimo || null,
          ranges: rng,
        });
      }
      onSaved();
    } catch (e: any) { setError(e instanceof ApiError ? e.message : (e?.message || e?.code || String(e) || "Errore salvataggio")); }
  }

  // Versione temporanea per l'anteprima
  function previewTariffa(): Tariffa {
    const r: number[][] = ranges.filter(r => r[2] != null).map(r => [r[0] ?? 0, r[1] as number | null, r[2] ?? 0] as unknown as number[]);
    return {
      id: 0, regione: livello === "regione" ? regione || null : null,
      nazione: livello === "regione" ? "IT" : livello === "nazione" ? nazione : livello,
      basePercent: base, stato, sogliaImporto: soglia || null, minimoImporto: minimo || null,
      ranges: r, updatedAt: new Date().toISOString(),
    };
  }

  return (
    <Modal size="sm" title={isNew ? "Nuova tariffa" : destTitle(tariffa!)} onClose={onClose}
      footer={
        <>
          {!isNew && tariffa!.nazione !== "ROW" && <button className="btn btn-danger" type="button" onClick={async () => { if (await confirm({ message: `Eliminare la tariffa "${destName(tariffa!)}"?`, tone: "danger", confirmLabel: "Elimina" })) { onDelete(tariffa!.id); onClose(); } }}>Elimina</button>}
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" type="button" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" type="button" onClick={async () => { if (await confirm({ message: isNew ? "Creare la nuova tariffa?" : "Salvare le modifiche?", confirmLabel: "Salva" })) save(); }}>Salva</button>
        </>
      }
    >
      {error && <div style={{ marginBottom: 12, color: "var(--danger)", fontSize: 13 }}>{error}</div>}

      {isNew ? (
        <div>
          <div className="field">
            <label>La tariffa vale per</label>
            <div className="seg">
              {(["regione","nazione","EUROPA","ROW"] as const).map(lv => (
                <button key={lv} className={`seg-btn${livello === lv ? " active" : ""}`} onClick={() => {
                  if (lv === "regione") { setNazione("IT"); setRegione(""); }
                  setLivello(lv);
                }} type="button">
                  {lv === "regione" ? "Regione" : lv === "nazione" ? "Nazione" : lv === "EUROPA" ? "Europa" : "Resto del mondo"}
                </button>
              ))}
            </div>
          </div>
          {livello === "nazione" && (
            <div className="field">
              <label>Nazione</label>
              <ComboboxField value={nazione} onChange={v => { setNazione(v || "IT"); if (v !== "IT") setRegione(""); }} options={nazioniOpts} placeholder="Cerca o seleziona…" />
            </div>
          )}
          {livello === "regione" && (
            <div className="field">
              <label>Regione (Italia)</label>
              <ComboboxField value={regione} onChange={v => setRegione(v)} options={regioniOpts} placeholder="Cerca o seleziona…" />
            </div>
          )}
          {(livello === "EUROPA" || livello === "ROW") && (
            <div className="field">
              <div className="zona-panel">
                <h3>{ZONE_KEYS[livello]}</h3>
                <p>{livello === "EUROPA" ? `Per i ${euCount()} paesi dell'area europea senza una tariffa di nazione o regione.` : "Default globale: vale per tutti i paesi del mondo senza una tariffa più specifica."}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="dest-desc">
            <h3>{desc!.title}</h3>
            <p>{desc!.text}</p>
          </div>
          <div className="hier" aria-label="Livello gerarchico della tariffa">
            <span className={`lvl${desc!.hier === "regione" ? " on" : ""}`}>Regione</span>
            <span className="arrow">→</span>
            <span className={`lvl${desc!.hier === "nazione" ? " on" : ""}`}>Nazione</span>
            <span className="arrow">→</span>
            <span className={`lvl${desc!.hier === "europa" ? " on" : ""}`}>Area</span>
            <span className="arrow">→</span>
            <span className={`lvl${desc!.hier === "row" ? " on" : ""}`}>Default</span>
          </div>
        </div>
      )}

      <div className="edit-cols">
        <div className="col">
          <div className="field">
            <label>Percentuale sull&apos;importo fattura (senza IVA)</label>
            <input className="input" type="number" step="0.1" min="0" value={base} onChange={e => setBase(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Stato</label>
            <select className="input" value={stato} onChange={e => setStato(e.target.value)}>
              <option value="ok">Configurata</option>
              <option value="pausa">In pausa</option>
              <option value="configura">Da configurare</option>
            </select>
          </div>
              <div className="field">
                <label>Soglia spedizione gratuita (€, vuoto = nessuna)</label>
                <input className="input" type="number" step="50" min="0" value={soglia || ""} onChange={e => setSoglia(Number(e.target.value) || 0)} />
              </div>
              <div className="field">
                <label>Minimo spesa spedizione (€, vuoto = nessuno)</label>
                <input className="input" type="number" step="0.1" min="0" value={minimo || ""} onChange={e => setMinimo(Number(e.target.value) || 0)} />
              </div>
          <div className="field">
            <button className="btn btn-secondary" type="button" onClick={() => onCalcPreview(previewTariffa())}>Anteprima calcolo</button>
          </div>
        </div>
        <div className="col">
          <div className="field">
            <label>Scaglioni per sconto medio <Hint>Gli scaglioni cambiano la percentuale in base allo sconto medio praticato al cliente rispetto al listino. Il primo parte da 0% e l&apos;ultimo arriva a "oltre": imposta solo il limite superiore di ciascuno.</Hint></label>
            <div className="range-table">
              {ranges.length === 0 ? (
                <div className="range-empty">Nessuno scaglione configurato: vale la percentuale di base.</div>
              ) : (
                <>
                  <div className="range-head">
                    <span className="range-from" style={{ color: "inherit" }}>Sconto da</span>
                    <span className="range-arrow" style={{ color: "inherit" }} />
                    <span className="range-max" style={{ color: "inherit", width: 96 }}>Fino a</span>
                    <span className="range-pct" style={{ color: "inherit", width: 96 }}>Percentuale</span>
                    <span />
                  </div>
                  {ranges.map((r, i) => (
                    <div key={i} className="range-row">
                      <span className="range-from">{fmtPct(r[0] ?? 0)}</span>
                      <span className="range-arrow">{r[1] === null ? "" : "→"}</span>
                      <span className="range-max" style={{ width: 96 }}>
                        {r[1] === null ? (
                          <span className="range-oltre">oltre</span>
                        ) : (
                          <>
                            <input className="range-input" type="number" step="0.5" min={(r[0] ?? 0) + 0.5} value={r[1]} onChange={e => updateRange(i, 1, e.target.value)} />
                            <span className="unit">%</span>
                          </>
                        )}
                      </span>
                      <span className="range-pct" style={{ width: 96 }}>
                        <input className="range-input" type="number" step="0.1" min="0" value={r[2] ?? ""} onChange={e => updateRange(i, 2, e.target.value)} />
                        <span className="unit">%</span>
                      </span>
                      <button className="range-del" type="button" onClick={() => removeRange(i)} title="Rimuovi" aria-label="Rimuovi scaglione">
                        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
            <button className="btn btn-sm" type="button" style={{ marginTop: 8 }} onClick={addRange}>+ Aggiungi scaglione</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ── Calcolatore modale ── */
function TariffaCalcModal({ mode, prevTariffa, allTariffe, onClose }: {
  mode: "sim" | "prev";
  prevTariffa: Tariffa | null;
  allTariffe: Tariffa[];
  onClose: () => void;
}) {
  const [nazione, setNazione] = useState(prevTariffa?.nazione ?? "IT");
  const [regione, setRegione] = useState(prevTariffa?.regione ?? "");
  const [amount, setAmount] = useState(10000);
  const [discount, setDiscount] = useState(8);

  const nazioniOpts: ComboboxOption[] = NAZIONI_ORDER.map(k => ({ value: k, label: NAZIONI[k].n, meta: NAZIONI[k].z === 'EU' ? 'EU' : undefined }));
  const regioniOpts: ComboboxOption[] = REGIONI_IT.map(r => ({ value: r, label: r }));

  const isPrev = mode === "prev";
  const title = isPrev ? "Anteprima calcolo" : "Simulatore di costo";

  let resolved: { t: Tariffa; source: string } | null;
  let calc: ReturnType<typeof calcFee> | null;
  if (isPrev && prevTariffa) {
    resolved = { t: prevTariffa, source: prevTariffa.stato === "ok" ? "prev" : "prev_pausa" };
    calc = calcFee(prevTariffa, amount, discount);
  } else {
    resolved = resolveTariffa(allTariffe, nazione, regione || null);
    calc = resolved ? calcFee(resolved.t, amount, discount) : null;
  }

  const sourceLabels: Record<string, string> = {
    regione: "Regione locale",
    nazione: "Nazione",
    europa: "Europa (tariffa d'area)",
    row: "Resto del mondo (default)",
    prev: "Tariffa in modifica",
    prev_pausa: "Tariffa in pausa",
  };

  return (
    <Modal size="sm" title={title} onClose={onClose}
      footer={<button className="btn btn-primary" type="button" onClick={onClose}>Chiudi</button>}
    >
          {!isPrev && (
            <>
              <div className="field">
                <label>Nazione di consegna</label>
                <ComboboxField value={nazione} onChange={v => { setNazione(v || "IT"); if (v !== "IT") setRegione(""); }} options={nazioniOpts} placeholder="Cerca o seleziona…" />
              </div>
              {nazione === "IT" && (
                <div className="field">
                  <label>Regione</label>
                  <ComboboxField value={regione} onChange={v => setRegione(v)} options={regioniOpts} placeholder="Cerca o seleziona…" />
                </div>
              )}
            </>
          )}
          {isPrev && prevTariffa && (
            <p className="sim-source" style={{ display: "block" }}>
              <b>{destName(prevTariffa)}</b> · {prevTariffa.stato === "pausa" ? "In pausa" : "Tariffa in modifica (non salvata)"}
            </p>
          )}
          <div className="field-row">
            <div className="field">
              <label>Importo fattura senza IVA (€)</label>
              <input className="input" type="number" step="50" min="0" value={amount} onChange={e => setAmount(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Sconto medio su listino (%)</label>
              <input className="input" type="number" step="0.5" min="0" max="30" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
            </div>
          </div>
          <div className="field">
            {resolved ? (
              <>
                <p className="sim-source">
                  <b>{destName(resolved.t)}</b> · {sourceLabels[resolved.source] ?? resolved.source}
                  {isPrev ? " (in modifica)" : (resolved.source === "regione" ? " (eccezione sopra la tariffa nazione)" : resolved.source === "row" ? " (default globale)" : " (fallback)")}
                </p>
                <div className={`sim-result${calc?.fee === 0 ? " free" : ""}`}>{calc ? fmtEur(calc.fee) : "—"}</div>
                {calc && (
                  <p className="sim-note">
                    {calc.rng ? `Scaglione ${calc.rng[0]}–${calc.rng[1] ?? "oltre"}% → ${fmtPct(calc.pct)}` : `Percentuale base ${fmtPct(calc.pct)}`}
                    {calc.superaSoglia && ` · spedizione gratuita (superata soglia di ${fmtEur(calc.soglia!)})`}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="sim-source">Tariffa da confermare</p>
                <div className="sim-result">—</div>
                <p className="sim-note">Nessuna tariffa attiva per questa destinazione. Configurala prima di calcolare le spese.</p>
              </>
            )}
          </div>
          <div className="field">
            <label>Riepilogo</label>
            <div className="sim-steps">
              <div className="sim-step"><div className="k">Importo netto</div><div className="v">{fmtEur(amount)}</div></div>
              <div className="sim-step"><div className="k">Sconto medio</div><div className="v">{fmtPct(discount)}</div></div>
              <div className="sim-step"><div className="k">Tariffa applicata</div><div className="v">{resolved ? destName(resolved.t) : "—"}</div></div>
              <div className="sim-step"><div className="k">Soglia gratuita</div><div className="v">{calc?.soglia ? fmtEur(calc.soglia) : "—"}</div></div>
              <div className="sim-step"><div className="k">Percentuale</div><div className="v">{calc ? fmtPct(calc.pct) : "—"}</div></div>
              <div className="sim-step"><div className="k">Spese di spedizione</div><div className="v" style={calc?.fee === 0 ? { color: "var(--ok)" } : undefined}>{calc ? fmtEur(calc.fee) : "—"}</div></div>
            </div>
          </div>
          <div className="field">
            <label>Percentuale per sconto medio</label>
            <div className="bars">
              {[0, 5, 10, 15, 20].map(s => {
                const p = resolved ? pctOf(resolved.t.ranges ?? [], resolved.t.basePercent, s).pct : 0;
                const maxPct = resolved ? Math.max(1, ...[0,5,10,15,20].map(x => pctOf(resolved.t.ranges ?? [], resolved.t.basePercent, x).pct)) : 1;
                return (
                  <div key={s} className={`bar${s === discount ? " hi" : ""}`} style={{ height: `${Math.max(3, (p / maxPct) * 100)}%` }}>
                    <span className="bv">{fmtPct(p)}</span>
                  </div>
                );
              })}
            </div>
          </div>
    </Modal>
  );
}

function GuidaModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal size="sm" title="Guida alle tariffe di spedizione" onClose={onClose}
      footer={<button className="btn btn-primary" type="button" onClick={onClose}>Chiudi</button>}
    >
      <div style={{ fontSize: 14, lineHeight: 1.7 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Gerarchia</h3>
        <p>Le tariffe seguono una catena di risoluzione a 4 livelli:</p>
        <ol style={{ paddingLeft: 20, margin: "8px 0" }}>
          <li><b>Regione</b> (Italia) — eccezione sopra la tariffa nazionale</li>
          <li><b>Nazione</b> — tariffa per un paese specifico</li>
          <li><b>Europa</b> — tariffa d&apos;area per i 27 paesi UE senza tariffa specifica</li>
          <li><b>Resto del mondo</b> — default globale, sempre presente</li>
        </ol>

        <h3 style={{ margin: "16px 0 8px", fontSize: 16 }}>Stati</h3>
        <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
          <li><b>Configurata</b> — attiva, partecipa alla risoluzione</li>
          <li><b>In pausa</b> — non attiva, ignorata nella risoluzione</li>
          <li><b>Da configurare</b> — bozza, non ancora attiva</li>
        </ul>

        <h3 style={{ margin: "16px 0 8px", fontSize: 16 }}>Scaglioni sconto medio</h3>
        <p>La percentuale applicata varia in base allo sconto medio del cliente sul listino. Gli scaglioni formano una catena da 0% a &quot;oltre&quot;. Se non configurati, vale la percentuale base.</p>

        <h3 style={{ margin: "16px 0 8px", fontSize: 16 }}>Soglia gratuita</h3>
        <p>Se l&apos;importo dell&apos;ordine (senza IVA) supera questa soglia, la spedizione è gratuita. Vuoto = nessuna soglia.</p>

        <h3 style={{ margin: "16px 0 8px", fontSize: 16 }}>Tariffa minima</h3>
        <p>Se la percentuale calcolata è inferiore a questo importo, viene applicato il minimo. Es: 2% di 100€ = 2€, ma con minimo 5€ → 5€.</p>

        <h3 style={{ margin: "16px 0 8px", fontSize: 16 }}>Regole</h3>
        <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
          <li>Non possono esistere due tariffe attive per la stessa destinazione</li>
          <li>La tariffa Resto del mondo non può essere eliminata</li>
          <li>Usa <b>Duplica</b> per creare una copia in bozza di una tariffa esistente</li>
        </ul>
      </div>
    </Modal>
  );
}
