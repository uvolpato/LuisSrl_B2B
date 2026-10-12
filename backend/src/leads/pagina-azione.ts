import { esc } from '../common/html';
import type { EsitoAzione } from './azioni.service';
import type { Azione } from './azioni';

const ETICHETTA: Record<Azione, string> = {
  approva: 'Approva',
  verifica: 'Metti in verifica',
  scarta: 'Scarta',
};
const COLORE: Record<Azione, string> = {
  approva: '#b2511e',
  verifica: '#221811',
  scarta: '#a33b2e',
};

/** Pagina HTML minimale (stile mail lead), senza script ne' risorse esterne: compatibile con la CSP di Helmet. */
export function paginaAzione(
  e: EsitoAzione,
  form?: { l: string; a: string; e: string; s: string },
): string {
  let titolo: string;
  let corpo: string;

  if (e.tipo === 'errore') {
    titolo = {
      invalido: 'Link non valido',
      scaduto: 'Link scaduto',
      inesistente: 'Richiesta non trovata',
    }[e.motivo];
    corpo = `<p>${e.motivo === 'scaduto' ? 'I link della mail valgono 7 giorni.' : 'Il link è incompleto o è stato modificato.'} Gestisci la richiesta dal portale o scrivi all'amministratore.</p>`;
  } else {
    const l = e.lead;
    const riepilogo = `<table style="width:100%;font-size:14px;border-collapse:collapse;margin:14px 0;">
      <tr><td style="color:#706760;padding:4px 0;width:130px;">Richiesta</td><td>#${l.id}</td></tr>
      <tr><td style="color:#706760;padding:4px 0;">Ragione sociale</td><td><strong>${esc(l.ragioneSociale)}</strong></td></tr>
      <tr><td style="color:#706760;padding:4px 0;">Partita IVA</td><td>${esc(l.partitaIva)}</td></tr>
      <tr><td style="color:#706760;padding:4px 0;">Verdetto AI</td><td>${esc(l.verdetto ?? 'non disponibile')}</td></tr>
      <tr><td style="color:#706760;padding:4px 0;">Stato attuale</td><td>${esc(l.stato)}</td></tr>
    </table>`;
    if (e.tipo === 'conferma' && form) {
      titolo = `${ETICHETTA[e.azione]} la richiesta?`;
      const avviso =
        e.azione === 'approva' && l.verdetto === 'SCARTARE'
          ? '<p style="background:#fbe9e6;border:1px solid #e8c4ba;border-radius:10px;padding:10px 14px;color:#a33b2e;">Attenzione: l\'indagine AI suggerisce di <strong>scartare</strong> questa richiesta. Approvare solo dopo una verifica diretta.</p>'
          : '';
      const hidden = (['l', 'a', 'e', 's'] as const)
        .map((k) => `<input type="hidden" name="${k}" value="${esc(form[k])}">`)
        .join('');
      corpo = `${riepilogo}${avviso}<form method="post" action="azione">${hidden}<button type="submit" style="background:${COLORE[e.azione]};color:#fff;border:0;border-radius:10px;padding:13px 22px;font-size:15px;font-weight:700;cursor:pointer;">Conferma: ${ETICHETTA[e.azione]}</button></form>`;
    } else if (e.tipo === 'eseguita') {
      titolo = {
        approva: 'Richiesta approvata',
        verifica: 'Richiesta messa in verifica',
        scarta: 'Richiesta scartata',
      }[e.azione];
      const seguito =
        e.azione === 'approva'
          ? '<p>Prossimo passo: creare il cliente in Integra e invitarlo dal portale (automatico nelle prossime fasi).</p>'
          : e.azione === 'verifica'
            ? '<p>Puoi ancora approvare o scartare dalla stessa mail, dopo la verifica.</p>'
            : '<p>Al richiedente non viene inviata alcuna comunicazione.</p>';
      corpo = `${riepilogo}${seguito}`;
    } else {
      titolo = 'Nessuna modifica';
      corpo = `${riepilogo}<p>La richiesta è già stata gestita (stato ${esc(e.lead.stato)}): questo link non può più modificarla.</p>`;
    }
  }

  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(titolo)} — Luis B2B</title></head>
<body style="background:#f3f1ec;margin:0;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#221811;">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e7e2db;border-radius:14px;padding:24px 28px;">
<p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#b2511e;margin:0 0 8px;">Richiesta accesso B2B</p>
<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;margin:0 0 6px;">${esc(titolo)}</h1>
${corpo}
</div></body></html>`;
}
