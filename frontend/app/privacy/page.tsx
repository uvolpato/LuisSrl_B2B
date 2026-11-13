import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Informativa privacy — Portale B2B Luis" };

const VERSIONE = "2026-11";

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "40px 20px 80px", fontSize: 14, lineHeight: 1.7 }}>
      <p style={{ marginBottom: 4 }}>
        <Link href="/area" style={{ fontSize: 13 }}>
          ← Torna al portale
        </Link>
      </p>

      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Informativa privacy</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        Artt. 13-14 Regolamento UE 2016/679 (GDPR) · versione {VERSIONE}
      </p>

      <h2>1. Titolare del trattamento</h2>
      <p>
        <strong>Luis S.r.l.</strong>, Via F. Bellafino 28/30, 24126 Bergamo (BG) — C.F. e P. IVA 04253020160.
        Contatto privacy: contatti@luisbg.it. Non è stato nominato un Responsabile della protezione dei dati
        (DPO), non obbligatorio per le attività svolte.
      </p>

      <h2>2. Dati trattati</h2>
      <ul>
        <li>
          <strong>Account</strong>: nome del referente, email, password (conservata solo come hash), lingua,
          stato dell&apos;account, log di accesso.
        </li>
        <li>
          <strong>Anagrafica aziendale</strong>: ragione sociale, P.IVA, C.F., indirizzi, telefono, condizioni
          commerciali, fido, codice SDI/PEC.
        </li>
        <li>
          <strong>Ordini e carrello</strong>: articoli, quantità, prezzi, indirizzi di consegna, note.
        </li>
        <li>
          <strong>Uso del portale</strong>: pagine consultate, tempo di permanenza, profondità di scorrimento,
          articoli aperti, ricerche, operazioni sul carrello, ordini, indirizzo IP, tipo di browser — solo per
          utenti autenticati.
        </li>
        <li>
          <strong>Funzioni con AI</strong>: testo delle ricerche in linguaggio naturale e foto caricate per la
          ricerca per immagine (la foto non viene conservata).
        </li>
        <li>
          <strong>Referenti dell&apos;azienda</strong>: nome e ruolo, forniti dall&apos;azienda cliente o
          proposti da fonti pubbliche (sito aziendale, registro imprese), con la fonte indicata.
        </li>
        <li>
          <strong>Sicurezza</strong>: log tecnici (IP, data/ora, esito delle richieste) e registro delle
          operazioni amministrative.
        </li>
      </ul>

      <h2>3. Finalità e basi giuridiche</h2>
      <ul>
        <li>Gestione dell&apos;account, del catalogo riservato, degli ordini e delle consegne — esecuzione del contratto (art. 6.1.b).</li>
        <li>Adempimenti fiscali e contabili, fatturazione elettronica, conservazione dei documenti — obbligo di legge (art. 6.1.c).</li>
        <li>Sicurezza del portale, prevenzione di accessi abusivi, registro delle operazioni — legittimo interesse (art. 6.1.f).</li>
        <li>Analisi dell&apos;utilizzo del portale per migliorare catalogo e assistenza — legittimo interesse (art. 6.1.f).</li>
        <li>Profilo commerciale dell&apos;azienda e suggerimenti di prodotto — legittimo interesse (art. 6.1.f).</li>
        <li>Ricerca semantica e ricerca per immagine — esecuzione del contratto (art. 6.1.b).</li>
      </ul>

      <h2>4. Utilizzo del portale e diritto di opposizione</h2>
      <p>
        Registriamo le azioni compiute nel portale <strong>dopo il login</strong>: pagine e tempo di
        permanenza, scorrimento, articoli aperti, ricerche, carrello, ordini, con IP e tipo di browser. Non
        tracciamo la navigazione fuori dal portale, non usiamo cookie di profilazione né servizi di analisi di
        terze parti. Il dettaglio è visibile solo al personale autorizzato.
      </p>
      <p>
        Puoi opporti in qualsiasi momento alla registrazione dell&apos;utilizzo dalla sezione{" "}
        <Link href="/area/profilo">Profilo → Privacy</Link>: la registrazione si ferma subito. Restano i dati
        necessari a ordini, fatture e sicurezza.
      </p>

      <h2>5. Intelligenza artificiale</h2>
      <p>
        Il portale usa modelli di intelligenza artificiale per interpretare le ricerche, confrontare immagini e
        proporre articoli pertinenti. Il profilo commerciale dell&apos;azienda è costruito con dati aziendali,
        dati di vendita e informazioni pubbliche. <strong>Non inviamo recapiti dei referenti ai fornitori di
        AI.</strong> Il profilo serve a proporre prodotti e a supportare il commerciale: non produce decisioni
        con effetti giuridici o analoghi (prezzi, fido e condizioni sono decisi da persone).
      </p>
      <p>
        Per la ricerca per immagine carica solo foto del prodotto: evita immagini che ritraggono persone.
        L&apos;immagine non viene conservata.
      </p>

      <h2>6. Destinatari</h2>
      <ul>
        <li>Personale autorizzato di Luis S.r.l.</li>
        <li>Responsabili del trattamento: Google (Gemini), Brevo per le comunicazioni commerciali, fornitore del gestionale (AGOMIR), servizio di posta elettronica, provider dei dati d&apos;impresa, hosting e assistenza tecnica, corrieri per le consegne.</li>
        <li>Autorità pubbliche e Sistema di Interscambio quando previsto dalla legge.</li>
      </ul>
      <p>I dati non sono diffusi né venduti.</p>

      <h2>7. Trasferimenti fuori dall&apos;Unione Europea</h2>
      <p>
        Google e il servizio di posta possono trattare dati negli Stati Uniti o in altri paesi extra-UE sulla
        base della decisione di adeguatezza EU-US Data Privacy Framework e/o delle clausole contrattuali
        standard della Commissione Europea.
      </p>

      <h2>8. Conservazione</h2>
      <ul>
        <li>Eventi di utilizzo del portale: 18 mesi, poi cancellati automaticamente.</li>
        <li>Profilo commerciale: finché il cliente è attivo; rimosso alla cessazione del rapporto su richiesta.</li>
        <li>Account e anagrafica: durata del rapporto commerciale.</li>
        <li>Ordini e documenti fiscali: 10 anni (obblighi civilistici e fiscali).</li>
        <li>Log tecnici e di sicurezza: 90-180 giorni secondo il tipo; azioni amministrative fino a 24 mesi.</li>
        <li>Sessione di accesso: 8 ore di inattività.</li>
      </ul>

      <h2>9. Cookie</h2>
      <p>
        Il portale usa solo cookie tecnici di prima parte: <code>luis.sid</code> (sessione, 8 ore),{" "}
        <code>lang</code> (lingua, 12 mesi) e, solo per gli amministratori che scelgono
        &quot;ricorda questo dispositivo&quot;, <code>luis.device</code> (dispositivo fidato per
        l&apos;autenticazione a due fattori, 90 giorni). Nessun cookie di profilazione o di terze parti: non
        serve un banner. Puoi cancellarli dalle impostazioni del browser.
      </p>

      <h2>10. Diritti dell&apos;interessato</h2>
      <p>
        Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità e opporti ai trattamenti
        basati sul legittimo interesse scrivendo a contatti@luisbg.it. Rispondiamo entro un mese. Puoi proporre
        reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).
      </p>
      <p>
        Se chiedi la cancellazione, rimuoviamo i dati personali del referente; conserviamo i dati aziendali e i
        documenti contabili per il periodo previsto dalla legge.
      </p>

      <h2>11. Modifiche</h2>
      <p>
        L&apos;informativa può essere aggiornata: la versione in vigore è indicata in questa pagina e viene
        riproposta al primo accesso successivo.
      </p>
    </main>
  );
}
