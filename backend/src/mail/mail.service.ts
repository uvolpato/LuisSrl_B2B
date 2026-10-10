import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ASSETS_BASE_DIR } from '../common/env';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private from: string;
  private domain: string;
  private testEmail: string | null;
  private assetsBase: string;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
    this.from = this.config.get<string>('SMTP_FROM') ?? 'noreply@luissrl.it';
    this.domain = this.config.get<string>('APP_DOMAIN') ?? 'http://localhost:3000';
    this.testEmail = this.config.get<string>('TEST_EMAIL') ?? null;
    this.assetsBase = ASSETS_BASE_DIR;
  }

  /**
   * Legge un template a ogni invio, cosi' e' modificabile senza riavviare il backend.
   * MAIL_TEMPLATES_DIR permette di tenerlo fuori dal build (in produzione dist/ viene
   * sovrascritto a ogni deploy). Ritorna '' se manca: chi chiama usa il fallback inline.
   */
  private leggiTemplate(nome: string): string {
    const configurata = this.config.get<string>('MAIL_TEMPLATES_DIR');
    const dirs = [
      configurata ? resolve(configurata) : null,
      join(__dirname, 'templates'),
    ].filter(Boolean) as string[];
    for (const dir of dirs) {
      try {
        const file = join(dir, nome);
        const html = readFileSync(file, 'utf-8');
        this.logger.log(`Template ${nome} letto da ${file}`);
        return html;
      } catch { /* provo il prossimo */ }
    }
    this.logger.warn(`Template ${nome} non trovato, uso il fallback inline`);
    return '';
  }

  private resolveRecipient(original: string): string {
    if (this.testEmail) {
      this.logger.log(`Email reindirizzata: ${original} -> ${this.testEmail}`);
      return this.testEmail;
    }
    return original;
  }

  async sendProvisionalPassword(
    to: string,
    nome: string,
    provisionalPassword: string,
    isReset: boolean,
  ): Promise<void> {
    const subject = isReset
      ? 'La tua password è stata resettata — Portale B2B Luis S.r.l.'
      : 'Benvenuto — Le tue credenziali Portale B2B Luis S.r.l.';

    const intro = isReset
      ? 'è stata generata una nuova password provvisoria per il tuo account.'
      : 'il tuo account è stato creato con successo.';

    const recipient = this.resolveRecipient(to);

    let html: string;
    const tpl = this.leggiTemplate('password-reset.html');
    if (tpl) {
      html = tpl
        .replace(/\{\{NOME\}\}/g, nome)
        .replace(/\{\{EMAIL\}\}/g, to)
        .replace(/\{\{PASSWORD\}\}/g, provisionalPassword)
        .replace(/\{\{INTRO\}\}/g, intro)
        .replace(/\{\{DOMAIN\}\}/g, this.domain);
    } else {
      html = `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px">
  <p>Buongiorno <strong>${nome}</strong>,</p>
  <p>${intro}</p>
  <p style="margin:20px 0"><strong>Email:</strong> ${to}<br>
  <strong>Password provvisoria:</strong> <code style="background:#f4f4f4;padding:2px 6px;border-radius:4px">${provisionalPassword}</code></p>
  <p>Al primo accesso ti verrà chiesto di cambiare la password.</p>
  <p><a href="${this.domain}/login" style="background:#b85c38;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Accedi al portale</a></p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #ddd">
  <p style="font-size:12px;color:#888">Luis S.r.l. — Questo messaggio è generato automaticamente, non rispondere.</p>
</div>`;
    }

    await this.transporter.sendMail({
      from: this.from,
      to: recipient,
      subject,
      html,
      attachments: html.includes('cid:logo') ? this.allegatoLogo() : [],
    });
  }

  /** Invito al portale B2B: presentazione + credenziali temporanee. Lancia in caso di errore SMTP. */
  async sendInvito(to: string, ragioneSociale: string, provisionalPassword: string): Promise<void> {
    const recipient = this.resolveRecipient(to);

    let html: string;
    const tplInvito = this.leggiTemplate('invito.html');
    if (tplInvito) {
      html = tplInvito
        .replace(/\{\{RAGIONE_SOCIALE\}\}/g, ragioneSociale)
        .replace(/\{\{EMAIL\}\}/g, to)
        .replace(/\{\{PASSWORD\}\}/g, provisionalPassword)
        .replace(/\{\{DOMAIN\}\}/g, this.domain);
    } else {
      // fallback minimale con i colori del portale
      html = `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f7f5f1;border:1px solid #dcd6d1;border-radius:12px">
  <h1 style="font-family:Georgia,serif;color:#221811;font-size:24px">Benvenuto nel Portale B2B Luis</h1>
  <p style="color:#221811">Gentile <strong>${ragioneSociale}</strong>, Luis S.r.l. ti invita al suo portale riservato ai rivenditori: catalogo con i tuoi prezzi (IVA esclusa), ordini online 24/7, novità e raccolte stagionali.</p>
  <p style="background:#fff;border:1px solid #b2511e;border-radius:8px;padding:14px;color:#221811">
    <strong>Email:</strong> ${to}<br>
    <strong>Password temporanea:</strong> <code style="background:#f7f5f1;padding:2px 6px;border-radius:4px">${provisionalPassword}</code><br>
    <span style="font-size:12px;color:#706760">Al primo accesso ti verrà chiesto di cambiarla.</span>
  </p>
  <p style="text-align:center;margin:20px 0"><a href="${this.domain}/login" style="background:#b2511e;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold">Accedi al portale</a></p>
  <p style="font-size:11px;color:#706760">Luis S.r.l. · Via F. Bellafino 28/30, Bergamo · Accesso su invito. Messaggio automatico, non rispondere.</p>
</div>`;
    }

    await this.transporter.sendMail({
      from: this.from,
      to: recipient,
      subject: 'Il tuo invito al Portale B2B Luis S.r.l.',
      html,
      attachments: html.includes('cid:logo') ? this.allegatoLogo() : [],
    });
  }

  /** Conferma d'ordine: logo, righe con immagine prodotto, totale, consegna. */
  async sendConfermaOrdine(to: string, dati: DatiConfermaOrdine): Promise<void> {
    const { html, attachments } = this.buildConfermaOrdine(dati);
    await this.transporter.sendMail({
      from: this.from,
      to: this.resolveRecipient(to),
      subject: `Ordine ${dati.numeroOrdine} registrato — Luis S.r.l.`,
      html,
      attachments,
    });
  }

  /**
   * Costruisce l'HTML della conferma d'ordine. Separato dall'invio perche' e'
   * la parte che vale la pena guardare e verificare senza mandare email vere
   * (scripts/anteprima-mail-ordine.ts).
   */
  renderConfermaOrdine(dati: DatiConfermaOrdine): string {
    return this.buildConfermaOrdine(dati).html;
  }

  /** Logo come allegato inline (cid:logo): non dipende dal dominio pubblico e i client che non
   *  supportano il webp (Outlook) lo comunque mostrano. */
  private allegatoLogo(): { filename: string; path: string; cid: string }[] {
    const logoPath = join(this.assetsBase, 'b2b', 'logo-email.png');
    return existsSync(logoPath)
      ? [{ filename: 'logo.png', path: logoPath, cid: 'logo' }]
      : [];
  }

  /**
   * HTML + allegati inline della conferma d'ordine. Solo il logo viene
   * incorporato come `cid:` (cosi' l'intestazione si vede sempre). Le immagini
   * prodotto restano URL esterni assoluti ({{DOMAIN}}/images/...): in produzione
   * il path e' corretto se APP_DOMAIN punta all'URL pubblico del portale.
   */
  private buildConfermaOrdine(dati: DatiConfermaOrdine): {
    html: string;
    attachments: { filename: string; path: string; cid: string }[];
  } {
    const attachments = this.allegatoLogo();

    const tpl = this.leggiTemplate('ordine-conferma.html');
    if (!tpl) {
      return { html: this.confermaOrdineFallback(dati), attachments };
    }

    // Il markup della riga vive nel template, non nel codice: si puo' cambiare
    // senza toccare TypeScript.
    const inizio = tpl.indexOf('<!--RIGA_START-->');
    const fine = tpl.indexOf('<!--RIGA_END-->');
    if (inizio === -1 || fine === -1) {
      this.logger.warn('ordine-conferma.html senza marcatori RIGA_START/RIGA_END');
      return { html: this.confermaOrdineFallback(dati), attachments };
    }
    const modelloRiga = tpl.slice(inizio + '<!--RIGA_START-->'.length, fine);

    const righe = dati.righe.map((r) => modelloRiga
      .replace(/\{\{R_IMMAGINE\}\}/g, this.urlAssoluto(r.immagineUrl))
      .replace(/\{\{R_DESCRIZIONE\}\}/g, esc(r.descrizione))
      .replace(/\{\{R_CODICE\}\}/g, esc(r.codice))
      .replace(/\{\{R_QTA\}\}/g, String(r.quantita))
      .replace(/\{\{R_PREZZO\}\}/g, euro(r.prezzo))
      .replace(/\{\{R_TOTALE\}\}/g, euro(r.prezzo * r.quantita)),
    ).join('');

    const note = dati.note?.trim()
      ? `<br><br><strong style="font-size:14px">Note</strong><br><span style="color:#706760">${esc(dati.note)}</span>`
      : '';

    const html = (tpl.slice(0, inizio) + righe + tpl.slice(fine + '<!--RIGA_END-->'.length))
      .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
      .replace(/\{\{DOMAIN\}\}/g, this.domain)
      .replace(/\{\{RAGIONE_SOCIALE\}\}/g, esc(dati.ragioneSociale))
      .replace(/\{\{NUMERO_ORDINE\}\}/g, esc(dati.numeroOrdine))
      .replace(/\{\{DATA_ORDINE\}\}/g, dati.dataOrdine)
      .replace(/\{\{N_ARTICOLI\}\}/g, String(dati.righe.length))
      .replace(/\{\{TOTALE\}\}/g, euro(dati.totale))
      .replace(/\{\{INDIRIZZO\}\}/g, esc(dati.indirizzo).replace(/\n/g, '<br>'))
      .replace(/\{\{NOTE\}\}/g, note);

    return { html, attachments };
  }

  /** Le immagini nelle email devono avere URL assoluti: nel DB sono relative (/images/...). */
  private urlAssoluto(url: string | null): string {
    // Riga senza immagine (es. la riga sconto del coupon): riquadro neutro, non il logo.
    if (!url) return `${this.domain}/images/b2b/placeholder-email.png`;
    return /^https?:\/\//i.test(url) ? url : `${this.domain}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private confermaOrdineFallback(d: DatiConfermaOrdine): string {
    const righe = d.righe
      .map((r) => `<tr><td style="padding:6px 0">${esc(r.descrizione)} <span style="color:#706760">(${esc(r.codice)})</span><br>${r.quantita} × ${euro(r.prezzo)}</td><td align="right">${euro(r.prezzo * r.quantita)}</td></tr>`)
      .join('');
    return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#221811">
  <h1 style="font-size:20px">Ordine ${esc(d.numeroOrdine)} registrato</h1>
  <p>Gentile <strong>${esc(d.ragioneSociale)}</strong>, abbiamo ricevuto il suo ordine del ${d.dataOrdine}.</p>
  <table width="100%" style="font-size:14px;border-collapse:collapse">${righe}</table>
  <p style="text-align:right;font-size:16px"><strong>Totale (IVA esclusa): ${euro(d.totale)}</strong></p>
  <p style="font-size:12px;color:#706760">Luis S.r.l. — messaggio automatico, non rispondere.</p>
</div>`;
  }

  /** Invia la notifica interna ordine a shop@luisbg.it usando il template email-notifica-ordine-interna.html */
  async sendNotificaOrdineInterna(dati: DatiOrdineMail): Promise<void> {
    try {
      const to = this.config.get<string>('MAIL_ORDINI_TO') || 'shop@luisbg.it';
      const from = this.config.get<string>('MAIL_ORDINI_FROM') || '"Portale B2B Luis" <noreply@luissrl.it>';

      const tpl = this.leggiTemplate('email-notifica-ordine-interna.html');
      if (!tpl) {
        this.logger.warn('Template email-notifica-ordine-interna.html non trovato');
        return;
      }

      let html = tpl;

      const formatEuro = (n: number | null | undefined): string => {
        const val = Number(n || 0);
        return val.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };
      const formatNumero = (n: number | null | undefined, dec = 2): string => {
        const val = Number(n || 0);
        return val.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      };
      const formatDataOra = (d: Date | string): string => {
        const dt = d instanceof Date ? d : new Date(d);
        if (isNaN(dt.getTime())) return String(d);
        const data = dt.toLocaleDateString('it-IT');
        const ora = dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return `${data} ${ora}`;
      };
      const formatData = (d: Date | string): string => {
        const dt = d instanceof Date ? d : new Date(d);
        if (isNaN(dt.getTime())) return String(d);
        return dt.toLocaleDateString('it-IT');
      };
      const buildIndirizzo = (indirizzo?: string | null, cap?: string | null, citta?: string | null, prov?: string | null, nazione?: string | null): string => {
        const parti = [indirizzo?.trim(), cap?.trim(), citta?.trim(), prov?.trim(), nazione?.trim()].filter(p => p && p.length > 0);
        return parti.join(' ');
      };
      const sostituisci = (html: string, chiave: string, valore: string | number | null | undefined): string => {
        const v = valore === null || valore === undefined ? '' : String(valore);
        let out = html.replace(new RegExp(`\\{\\{\\s*${chiave}\\s*\\}\\}`, 'gi'), v);
        out = out.replace(new RegExp(`\\{\\{\\s*${chiave.toLowerCase()}\\s*\\}\\}`, 'gi'), v);
        return out;
      };

      const dataOraFormatted = formatDataOra(dati.dataOra);
      const dataFormatted = formatData(dati.dataOra);

      const indirizzoFatt = buildIndirizzo(dati.cliente.indirizzoFatturazione, dati.cliente.capFatturazione, dati.cliente.cittaFatturazione, dati.cliente.provinciaFatturazione, dati.cliente.nazioneFatturazione);
      const indirizzoSped = buildIndirizzo(dati.cliente.indirizzoSpedizione, dati.cliente.capSpedizione, dati.cliente.cittaSpedizione, dati.cliente.provinciaSpedizione, dati.cliente.nazioneSpedizione);

      html = sostituisci(html, 'NUMERO_ORDINE', dati.numeroOrdine || '');
      html = sostituisci(html, 'ID_ORDINE', dati.idOrdine ?? '');
      html = sostituisci(html, 'DATA_ORDINE', dataFormatted);
      html = sostituisci(html, 'DATA_ORA_ORDINE', dataOraFormatted);
      html = sostituisci(html, 'DATAORA_ORDINE', dataOraFormatted);

      html = sostituisci(html, 'RAGIONE_SOCIALE', dati.cliente.ragioneSociale || '');
      html = sostituisci(html, 'CODICE_CLIENTE', dati.cliente.codiceCliente || '');
      html = sostituisci(html, 'PARTITA_IVA', dati.cliente.partitaIva || '');
      html = sostituisci(html, 'CODICE_FISCALE', dati.cliente.codiceFiscale || '');
      html = sostituisci(html, 'EMAIL_CLIENTE', dati.cliente.email || '');
      html = sostituisci(html, 'TELEFONO_CLIENTE', dati.cliente.telefono || '');
      html = sostituisci(html, 'REFERENTE', dati.cliente.referente || '');

      html = sostituisci(html, 'INDIRIZZO_FATTURAZIONE', indirizzoFatt);
      html = sostituisci(html, 'INDIRIZZO_SPEDIZIONE', indirizzoSped);
      html = sostituisci(html, 'INDIRIZZO_FATT', indirizzoFatt);
      html = sostituisci(html, 'INDIRIZZO_SPE', indirizzoSped);

      const note = dati.noteCliente?.trim() || '';
      html = sostituisci(html, 'NOTE_CLIENTE', note);
      html = sostituisci(html, 'NOTE', note);

      html = sostituisci(html, 'IMPONIBILE_IVA_ESCL', formatEuro(dati.imponibileIvaEsclusa));
      html = sostituisci(html, 'SPESE_TRASPORTO_IVA_ESCL', formatEuro(dati.speseTrasportoIvaEsclusa || 0));
      html = sostituisci(html, 'TOTALE_ORDINE_IVA_ESCL', formatEuro(dati.totaleOrdineIvaEsclusa));
      html = sostituisci(html, 'TOTALE_IVA_ESCL', formatEuro(dati.totaleOrdineIvaEsclusa));

      const rigaTemplate = `
        <tr>
          <td style="padding:6px;border:1px solid #ddd;text-align:center;">{{NUMERO}}</td>
          <td style="padding:6px;border:1px solid #ddd;">{{CODICE_ARTICOLO}}</td>
          <td style="padding:6px;border:1px solid #ddd;">{{CODICE_VARIANTE}}</td>
          <td style="padding:6px;border:1px solid #ddd;">{{DESCRIZIONE_ARTICOLO}}</td>
          <td style="padding:6px;border:1px solid #ddd;">{{DESCRIZIONE_VARIANTE}}</td>
          <td style="padding:6px;border:1px solid #ddd;text-align:center;">{{QUANTITA}}</td>
          <td style="padding:6px;border:1px solid #ddd;text-align:center;">{{UM}}</td>
          <td style="padding:6px;border:1px solid #ddd;text-align:right;">{{PREZZO_LISTINO}}{{PREZZO_IVA_ESCL}}</td>
          <td style="padding:6px;border:1px solid #ddd;text-align:center;">{{SCONTO_PERC}}</td>
          <td style="padding:6px;border:1px solid #ddd;text-align:right;">{{TOTALE_RIGA_IVA_ESCL}}</td>
        </tr>`;

      const righeHtml = dati.articoli
        .map((a, i) => {
          let r = rigaTemplate;
          r = r.replace('{{NUMERO}}', String(a.numero ?? i + 1));
          r = r.replace('{{CODICE_ARTICOLO}}', a.codiceArticolo || '');
          r = r.replace('{{CODICE_VARIANTE}}', a.codiceVariante || '');
          r = r.replace('{{DESCRIZIONE_ARTICOLO}}', a.descrizioneArticolo || '');
          r = r.replace('{{DESCRIZIONE_VARIANTE}}', a.descrizioneVariante || '');
          r = r.replace('{{QUANTITA}}', formatNumero(a.quantita, 0));
          r = r.replace('{{UM}}', a.unitaMisura || 'PZ');
          const prezzoNetto = formatEuro(a.prezzoIvaEsclusa);
          const prezzoListinoHtml = a.prezzoListino && a.prezzoListino > a.prezzoIvaEsclusa
            ? `<span style="text-decoration:line-through;color:#999;margin-right:6px;font-size:0.9em;">${formatEuro(a.prezzoListino)}</span>`
            : '';
          r = r.replace('{{PREZZO_LISTINO}}', prezzoListinoHtml);
          r = r.replace('{{PREZZO_IVA_ESCL}}', prezzoNetto);
          r = r.replace('{{SCONTO_PERC}}', a.scontoPercentuale ? formatNumero(a.scontoPercentuale, 2) + '%' : '0,00%');
          r = r.replace('{{TOTALE_RIGA_IVA_ESCL}}', formatEuro(a.totaleRigaIvaEsclusa));
          return r;
        })
        .join('\n');

      if (/\{\{\s*RIGHE_ARTICOLI\s*\}\}/i.test(html)) {
        html = html.replace(/\{\{\s*RIGHE_ARTICOLI\s*\}\}/gi, righeHtml);
      } else {
        html = html.replace(/<tbody[^>]*>[\s\S]*?<\/tbody>/i, `<tbody>${righeHtml}</tbody>`);
      }

      const oggetto = `Nuovo ordine B2B ${dati.numeroOrdine} - ${dataFormatted}`;

      const recipient = this.resolveRecipient(to);
      await this.transporter.sendMail({
        from,
        to: recipient,
        subject: oggetto,
        html,
      });

      this.logger.log(`Mail notifica ordine interna inviata a ${to} per ordine ${dati.numeroOrdine}`);
    } catch (error: any) {
      this.logger.warn(`Invio mail notifica ordine interna fallito per ${dati.numeroOrdine}: ${error?.message || error}`);
    }
  }
}

export interface RigaConfermaOrdine {
  codice: string;
  descrizione: string;
  quantita: number;
  prezzo: number;
  immagineUrl: string | null;
}

export interface DatiConfermaOrdine {
  ragioneSociale: string;
  numeroOrdine: string;
  dataOrdine: string;
  totale: number;
  indirizzo: string;
  note?: string | null;
  righe: RigaConfermaOrdine[];
}

export interface DatiClienteMail {
  ragioneSociale?: string | null;
  codiceCliente?: string | null;
  partitaIva?: string | null;
  codiceFiscale?: string | null;
  email?: string | null;
  telefono?: string | null;
  referente?: string | null;
  indirizzoFatturazione?: string | null;
  capFatturazione?: string | null;
  cittaFatturazione?: string | null;
  provinciaFatturazione?: string | null;
  nazioneFatturazione?: string | null;
  indirizzoSpedizione?: string | null;
  capSpedizione?: string | null;
  cittaSpedizione?: string | null;
  provinciaSpedizione?: string | null;
  nazioneSpedizione?: string | null;
}

export interface RigaArticoloMail {
  numero: number;
  codiceArticolo?: string | null;
  codiceVariante?: string | null;
  descrizioneArticolo?: string | null;
  descrizioneVariante?: string | null;
  quantita: number;
  unitaMisura?: string | null;
  prezzoIvaEsclusa: number;
  prezzoListino?: number | null;
  scontoPercentuale?: number | null;
  totaleRigaIvaEsclusa: number;
}

export interface DatiOrdineMail {
  numeroOrdine: string;
  idOrdine?: number | string | null;
  dataOra: Date | string;
  cliente: DatiClienteMail;
  articoli: RigaArticoloMail[];
  imponibileIvaEsclusa: number;
  speseTrasportoIvaEsclusa?: number | null;
  totaleOrdineIvaEsclusa: number;
  noteCliente?: string | null;
}

/** I dati arrivano dal DB e finiscono in HTML: vanno neutralizzati. */
function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

function euro(n: number): string {
  return `${n.toFixed(2).replace('.', ',')} €`;
}