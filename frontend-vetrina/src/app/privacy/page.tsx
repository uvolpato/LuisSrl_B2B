import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { Da, Documento } from '@/components/legal/Legale';

// BOZZA da validare (titolare / consulente privacy). Descrive i trattamenti reali del codice:
// form richiesta accesso → backend/src/leads (indagine VIES + Gemini, conservazione 12 mesi).
// La versione deve coincidere con PRIVACY_VERSIONE del backend (salvata col consenso).
const VERSIONE = '2026-10';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Privacy Policy — Luis S.r.l.' };
}

export default async function PrivacyPage() {
  return (await getLocale()) === 'en' ? <En /> : <It />;
}

function It() {
  return (
    <Documento eyebrow='Informativa' titolo='Privacy Policy' aggiornato={`Informativa ai sensi degli artt. 13–14 del Regolamento UE 2016/679 (GDPR) · versione ${VERSIONE}`}>
      <h2>1. Titolare del trattamento</h2>
      <p>
        <strong>Luis S.r.l.</strong>, Via F. Bellafino 28/30, 24126 Bergamo (BG) · C.F. e P. IVA 04253020160.<br />
        Contatto per la privacy: <Da><a href='mailto:contatti@luisbg.it'>contatti@luisbg.it</a></Da>.<br />
        Il Titolare non ha nominato un Responsabile della protezione dei dati (DPO), non essendo obbligatorio per le attività svolte.
      </p>

      <h2>2. Quali dati trattiamo</h2>
      <h3>a) Navigazione del sito</h3>
      <p>
        Il server registra i dati tecnici delle richieste (indirizzo IP, data e ora, pagina richiesta, tipo di browser) per il
        funzionamento e la sicurezza del sito. Il sito <strong>non usa strumenti di statistica o di profilazione</strong> e non
        carica contenuti di terze parti (immagini e caratteri sono ospitati sul nostro server). Sui cookie vedi la{' '}
        <Link href='/cookie'>Cookie Policy</Link>.
      </p>
      <h3>b) Richiesta di accesso al portale B2B</h3>
      <p>
        Con il modulo &quot;Richiedi accesso B2B&quot; raccogliamo: ragione sociale, partita IVA, codice fiscale, nome del
        referente, tipo di attività, email, telefono, comune/provincia ed eventuale messaggio. Registriamo inoltre data e ora del
        consenso a questa informativa, la sua versione, l&apos;indirizzo IP e il tipo di browser, come prova della richiesta.
        I campi contrassegnati con * sono necessari: senza di essi non possiamo valutare la richiesta.
      </p>

      <h2>3. Finalità e basi giuridiche</h2>
      <ul>
        <li><strong>Valutare la richiesta e attivare l&apos;accesso al portale B2B</strong> — misure precontrattuali richieste dall&apos;interessato (art. 6.1.b GDPR).</li>
        <li><strong>Verificare che l&apos;azienda esista e sia attiva</strong>, per prevenire richieste false o abusive — legittimo interesse del Titolare (art. 6.1.f).</li>
        <li><strong>Inviarti la conferma di ricezione</strong> della richiesta — art. 6.1.b.</li>
        <li><strong>Sicurezza del sito</strong> e prevenzione di abusi (log tecnici, limiti alle richieste) — art. 6.1.f.</li>
        <li><strong>Obblighi di legge</strong> (es. fiscali, una volta diventati clienti) — art. 6.1.c.</li>
      </ul>

      <h2>4. Verifica automatica della richiesta</h2>
      <p>
        Alla ricezione, un sistema automatico verifica i <strong>dati aziendali</strong>: la partita IVA sul servizio ufficiale
        VIES della Commissione Europea (da cui ricaviamo anche l&apos;indirizzo della sede legale) e la presenza dell&apos;azienda sul
        web tramite il servizio di intelligenza artificiale Google Gemini con ricerca web. A quest&apos;ultimo inviamo solo ragione
        sociale, partita IVA, dominio dell&apos;email, comune e tipo di attività — <strong>non</strong> il nome del referente, il
        telefono né il messaggio.
      </p>
      <p>
        Il sistema propone un giudizio (buono / da verificare / da scartare) a uso interno.{' '}
        <strong>La decisione sull&apos;accesso è sempre presa da una persona</strong> del nostro ufficio commerciale: non si tratta
        di una decisione basata unicamente su un trattamento automatizzato ai sensi dell&apos;art. 22 GDPR.
      </p>

      <h2>5. A chi comunichiamo i dati</h2>
      <ul>
        <li>Personale autorizzato di Luis S.r.l. (ufficio commerciale e amministrazione).</li>
        <li>Fornitori che trattano dati per nostro conto, nominati responsabili del trattamento: servizio di posta elettronica <Da>Microsoft (Outlook / Microsoft 365)</Da>; Google (servizio Gemini, solo per i dati aziendali indicati al punto 4); il fornitore del gestionale aziendale, se la richiesta viene approvata (anagrafica cliente).</li>
        <li>Commissione Europea, per la sola verifica della partita IVA sul sistema VIES.</li>
      </ul>
      <p>I dati non vengono diffusi né venduti.</p>

      <h2>6. Trasferimenti fuori dall&apos;Unione Europea</h2>
      <p>
        Google e Microsoft possono trattare dati anche fuori dall&apos;UE (es. Stati Uniti). In tal caso il trasferimento avviene
        sulla base della decisione di adeguatezza EU-US Data Privacy Framework e/o delle clausole contrattuali standard della
        Commissione Europea. <Da>Da verificare sui contratti dei due fornitori.</Da>
      </p>

      <h2>7. Per quanto tempo conserviamo i dati</h2>
      <ul>
        <li><strong>Richieste non accolte o non gestite:</strong> 12 mesi, poi i dati personali (referente, email, telefono, messaggio, IP, browser) vengono cancellati in modo automatico; restano solo i dati aziendali.</li>
        <li><strong>Richieste approvate:</strong> per la durata del rapporto commerciale e poi per i tempi previsti dalla legge (es. 10 anni per la documentazione contabile).</li>
        <li><strong>Log tecnici del sito:</strong> <Da>[DA COMPLETARE — durata dei log del server]</Da>.</li>
        <li><strong>Copie di sicurezza:</strong> <Da>[DA COMPLETARE — dove e per quanto]</Da>.</li>
      </ul>

      <h2>8. I tuoi diritti</h2>
      <p>
        Puoi chiedere in ogni momento accesso, rettifica, cancellazione, limitazione del trattamento, portabilità dei dati e
        opporti ai trattamenti basati sul legittimo interesse, scrivendo a <Da><a href='mailto:contatti@luisbg.it'>contatti@luisbg.it</a></Da>.
        Hai inoltre il diritto di proporre reclamo al Garante per la protezione dei dati personali
        (<a href='https://www.garanteprivacy.it' target='_blank' rel='noopener noreferrer'>www.garanteprivacy.it</a>).
      </p>

      <h2>9. Portale B2B</h2>
      <p>
        L&apos;uso del portale riservato ai clienti (<a href='https://shop.luisbg.it' target='_blank' rel='noopener'>shop.luisbg.it</a>)
        è regolato da un&apos;informativa specifica, mostrata al primo accesso.
      </p>

      <h2>10. Modifiche</h2>
      <p>Questa informativa può essere aggiornata; la versione in vigore è sempre pubblicata in questa pagina (versione {VERSIONE}).</p>
    </Documento>
  );
}

function En() {
  return (
    <Documento eyebrow='Information notice' titolo='Privacy Policy' aggiornato={`Information pursuant to Articles 13–14 of Regulation (EU) 2016/679 (GDPR) · version ${VERSIONE}`}>
      <p className='legal-note'>This is a courtesy translation; the Italian version prevails.</p>

      <h2>1. Data controller</h2>
      <p>
        <strong>Luis S.r.l.</strong>, Via F. Bellafino 28/30, 24126 Bergamo (BG), Italy · Tax code and VAT no. 04253020160.<br />
        Privacy contact: <Da><a href='mailto:contatti@luisbg.it'>contatti@luisbg.it</a></Da>.<br />
        No Data Protection Officer (DPO) has been appointed, as it is not required for the controller&apos;s activities.
      </p>

      <h2>2. Data we process</h2>
      <h3>a) Browsing</h3>
      <p>
        Our server logs technical request data (IP address, date and time, requested page, browser type) to operate and secure the
        website. The website <strong>does not use analytics or profiling tools</strong> and loads no third-party content. For
        cookies see the <Link href='/cookie'>Cookie Policy</Link>.
      </p>
      <h3>b) B2B access request</h3>
      <p>
        Through the &quot;Request B2B access&quot; form we collect: company name, VAT number, tax code, contact person, business
        type, email, phone, town/province and an optional message. We also record the date and time of your consent to this notice,
        its version, your IP address and browser type as evidence of the request. Fields marked with * are required.
      </p>

      <h2>3. Purposes and legal bases</h2>
      <ul>
        <li><strong>Assessing the request and activating B2B access</strong> — pre-contractual measures at your request (Art. 6(1)(b) GDPR).</li>
        <li><strong>Checking that the company exists and is active</strong>, to prevent false or abusive requests — legitimate interest (Art. 6(1)(f)).</li>
        <li><strong>Sending you an acknowledgement of receipt</strong> — Art. 6(1)(b).</li>
        <li><strong>Website security</strong> and abuse prevention — Art. 6(1)(f).</li>
        <li><strong>Legal obligations</strong> (e.g. tax, once you become a customer) — Art. 6(1)(c).</li>
      </ul>

      <h2>4. Automated check of the request</h2>
      <p>
        On receipt, an automated system checks the <strong>company data</strong>: the VAT number on the European Commission&apos;s
        official VIES service (which also provides the registered office address) and the company&apos;s web presence through
        Google Gemini AI with web search. We only send company name, VAT number, email domain, town and business type —{' '}
        <strong>not</strong> the contact person&apos;s name, phone or message.
      </p>
      <p>
        The system suggests an internal assessment. <strong>The access decision is always taken by a person</strong> in our sales
        office: it is not a decision based solely on automated processing within the meaning of Art. 22 GDPR.
      </p>

      <h2>5. Recipients</h2>
      <ul>
        <li>Authorised staff of Luis S.r.l.</li>
        <li>Processors acting on our behalf: email service <Da>Microsoft (Outlook / Microsoft 365)</Da>; Google (Gemini, company data only); our ERP provider if the request is approved.</li>
        <li>The European Commission, solely for the VIES VAT check.</li>
      </ul>
      <p>Data is not disclosed to the public or sold.</p>

      <h2>6. Transfers outside the EU</h2>
      <p>
        Google and Microsoft may process data outside the EU (e.g. United States) under the EU-US Data Privacy Framework and/or the
        European Commission&apos;s standard contractual clauses. <Da>To be verified against the providers&apos; contracts.</Da>
      </p>

      <h2>7. Retention</h2>
      <ul>
        <li><strong>Requests not accepted or not handled:</strong> 12 months, after which personal data is automatically erased; only company data is kept.</li>
        <li><strong>Approved requests:</strong> for the duration of the business relationship and then as required by law (e.g. 10 years for accounting records).</li>
        <li><strong>Server logs and backups:</strong> <Da>[TO BE COMPLETED]</Da>.</li>
      </ul>

      <h2>8. Your rights</h2>
      <p>
        You may request access, rectification, erasure, restriction, portability and object to processing based on legitimate
        interest by writing to <Da><a href='mailto:contatti@luisbg.it'>contatti@luisbg.it</a></Da>. You may also lodge a complaint
        with the Italian Data Protection Authority (<a href='https://www.garanteprivacy.it' target='_blank' rel='noopener noreferrer'>www.garanteprivacy.it</a>).
      </p>

      <h2>9. B2B portal</h2>
      <p>The customer portal is governed by a specific notice shown at first login.</p>

      <h2>10. Changes</h2>
      <p>This notice may be updated; the current version is always published on this page (version {VERSIONE}).</p>
    </Documento>
  );
}
