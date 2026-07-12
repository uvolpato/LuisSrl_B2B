import { readFileSync } from 'fs';
import { join } from 'path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private from: string;
  private domain: string;
  private testEmail: string | null;
  private template: string;
  private invitoTemplate: string;

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
}
