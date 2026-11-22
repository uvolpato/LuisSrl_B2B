/**
 * Prova dello SMTP impostato nella shell, senza modificare .env.
 *
 *   $env:SMTP_HOST='smtp-relay.brevo.com'; $env:SMTP_PORT='587'; $env:SMTP_USER='<login-brevo>'; $env:SMTP_PASS='<chiave-smtp>'; $env:SMTP_FROM='<mittente-verificato>'; $env:MAIL_ORDINI_FROM='<mittente-verificato>'
 *   npx ts-node --transpile-only scripts/test-smtp-brevo.ts
 *
 * Le mail vanno a TEST_EMAIL (vedi .env): niente viene inviato ai clienti reali.
 */
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import {
  MailService,
  type DatiConfermaOrdine,
  type DatiOrdineMail,
} from '../src/mail/mail.service';

for (const chiave of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']) {
  if (!process.env[chiave]) throw new Error(`${chiave} mancante: impostalo nella shell prima di eseguire`);
}

const mail = new MailService(new ConfigService());
const destinatario = process.env.TEST_EMAIL || 'test@luissrl.it';
const ora = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const data = `${pad(ora.getDate())}/${pad(ora.getMonth() + 1)}/${ora.getFullYear()}`;
const numeroOrdine = 'B2B-TEST-SMTP';

const conferma: DatiConfermaOrdine = {
  ragioneSociale: 'Cliente Test SMTP',
  numeroOrdine,
  dataOrdine: data,
  totale: 123.45,
  indirizzo: 'Via Roma 1\n20100 Milano MI',
  note: 'Mail di prova SMTP — da ignorare',
  righe: [{
    codice: 'TEST-001',
    descrizione: 'Vaso in ceramica (test)',
    quantita: 1,
    prezzo: 123.45,
    immagineUrl: null,
  }],
};

const interna: DatiOrdineMail = {
  numeroOrdine,
  idOrdine: 0,
  dataOra: ora,
  cliente: { ragioneSociale: 'Cliente Test SMTP', email: 'cliente-test@example.com' },
  articoli: [{
    numero: 1,
    codiceArticolo: 'TEST-001',
    descrizioneArticolo: 'Vaso in ceramica (test)',
    quantita: 1,
    prezzoIvaEsclusa: 123.45,
    totaleRigaIvaEsclusa: 123.45,
  }],
  imponibileIvaEsclusa: 123.45,
  totaleOrdineIvaEsclusa: 123.45,
  noteCliente: 'Mail di prova SMTP — da ignorare',
};

(async () => {
  console.log(`SMTP ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} (utente ${process.env.SMTP_USER})`);
  console.log(`Destinatario di prova: ${destinatario} (TEST_EMAIL)`);

  await mail.sendProvisionalPassword(destinatario, 'Test SMTP', 'Prova123!', false);
  console.log('OK 1/3 password provvisoria');

  await mail.sendConfermaOrdine(destinatario, conferma);
  console.log('OK 2/3 conferma ordine cliente');

  // Questo metodo inghiotte gli errori: la consegna va controllata nella casella.
  await mail.sendNotificaOrdineInterna(interna);
  console.log('Richiesta 3/3 notifica ordine interna — controllare la casella e i log');
})().catch((e) => {
  console.error('Invio fallito:', e?.message ?? e);
  process.exit(1);
});
