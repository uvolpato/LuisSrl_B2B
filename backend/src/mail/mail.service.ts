import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
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
  private template: string;
  private invitoTemplate: string;
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

    try {
      this.template = readFileSync(join(__dirname, 'templates', 'password-reset.html'), 'utf-8');
    } catch {
      this.logger.warn('Template email non trovato, usa fallback inline');
      this.template = '';
    }
    try {
      this.invitoTemplate = readFileSync(join(__dirname, 'templates', 'invito.html'), 'utf-8');
    } catch {
      this.logger.warn('Template invito non trovato, usa fallback inline');
      this.invitoTemplate = '';
    }
  }

  /**
   * Legge un template a ogni invio, cosi' e' modificabile senza riavviare il backend.
   * MAIL_TEMPLATES_DIR permette di tenerlo fuori dal build (in produzione dist/ viene
   * sovrascritto a ogni deploy). Ritorna '' se manca: chi chiama usa il fallback inline.
   */
  private leggiTemplate(nome: string): string {
    const dirs = [
      this.config.get<string>('MAIL_TEMPLATES_DIR'),
      join(__dirname, 'templates'),
    ].filter(Boolean) as string[];
    for (const dir of dirs) {
      try {
        return readFileSync(join(dir, nome), 'utf-8');
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
    if (this.template) {
      html = this.template
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
    });
  }

  /** Invito al portale B2B: presentazione + credenziali temporanee. Lancia in caso di errore SMTP. */
  async sendInvito(to: string, ragioneSociale: string, provisionalPassword: string): Promise<void> {
    const recipient = this.resolveRecipient(to);

    let html: string;
    if (this.invitoTemplate) {
      html = this.invitoTemplate
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
    const attachments: { filename: string; path: string; cid: string }[] = [];

    const logoPath = join(this.assetsBase, 'b2b', 'logo-email.png');
    if (existsSync(logoPath)) attachments.push({ filename: 'logo.png', path: logoPath, cid: 'logo' });

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

/** I dati arrivano dal DB e finiscono in HTML: vanno neutralizzati. */
function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function euro(n: number): string {
  return `${n.toFixed(2).replace('.', ',')} €`;
}
