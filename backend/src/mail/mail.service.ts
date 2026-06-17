import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private from: string;

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

    const html = `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
  <p>Buongiorno <strong>${nome}</strong>,</p>
  <p>${intro}</p>
  <p style="margin:20px 0"><strong>Email:</strong> ${to}<br>
  <strong>Password provvisoria:</strong> <code style="background:#f4f4f4;padding:2px 6px;border-radius:4px">${provisionalPassword}</code></p>
  <p>Al primo accesso ti verrà chiesto di cambiare la password.</p>
  <p><a href="https://portale.luissrl.it/login" style="background:#b85c38;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Accedi al portale</a></p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #ddd">
  <p style="font-size:12px;color:#888">Luis S.r.l. — Questo messaggio è generato automaticamente, non rispondere.</p>
</div>`;

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      html,
    });
  }
}
