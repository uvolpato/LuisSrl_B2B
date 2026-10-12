import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { Documento } from '@/components/legal/Legale';

// BOZZA da validare. Inventario reale dei cookie del sito vetrina: solo `lang` (Header.tsx).
// Se si aggiungono analytics o contenuti di terze parti servono banner e consenso preventivo.

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Cookie Policy — Luis S.r.l.' };
}

export default async function CookiePage() {
  const en = (await getLocale()) === 'en';
  return en ? (
    <Documento eyebrow='Information notice' titolo='Cookie Policy' aggiornato='Last updated: October 2026'>
      <p className='legal-note'>This is a courtesy translation; the Italian version prevails.</p>
      <h2>What we use</h2>
      <p>
        This website only uses <strong>one technical cookie</strong>, set by the site itself (first-party). It uses no analytics, profiling,
        advertising or third-party cookies, and loads no external content.
      </p>
      <Tabella en />
      <h2>Consent</h2>
      <p>
        Technical cookies do not require consent (Art. 122 of the Italian Privacy Code and Italian DPA guidelines of 10 June 2021),
        so no consent banner is shown. You can delete or block cookies in your browser settings: the site keeps working and
        simply shows the default language.
      </p>
      <h2>More information</h2>
      <p>See the <Link href='/privacy'>Privacy Policy</Link> for data controller details and your rights.</p>
    </Documento>
  ) : (
    <Documento eyebrow='Informativa' titolo='Cookie Policy' aggiornato='Ultimo aggiornamento: ottobre 2026'>
      <h2>Cosa usiamo</h2>
      <p>
        Questo sito usa <strong>un solo cookie tecnico</strong>, impostato dal sito stesso (di prima parte). Non usa cookie di statistica, di
        profilazione, pubblicitari o di terze parti, e non carica contenuti esterni.
      </p>
      <Tabella />
      <h2>Consenso</h2>
      <p>
        I cookie tecnici non richiedono il consenso (art. 122 del Codice privacy e Linee guida del Garante del 10 giugno 2021),
        per questo il sito non mostra un banner. Puoi cancellare o bloccare i cookie dalle impostazioni del browser: il sito
        continua a funzionare e mostra la lingua predefinita.
      </p>
      <h2>Altre informazioni</h2>
      <p>Titolare del trattamento e diritti sono indicati nella <Link href='/privacy'>Privacy Policy</Link>.</p>
    </Documento>
  );
}

function Tabella({ en = false }: { en?: boolean }) {
  return (
    <div className='legal-table-wrap'>
      <table className='legal-table'>
        <thead>
          <tr>
            <th>{en ? 'Name' : 'Nome'}</th>
            <th>{en ? 'Type' : 'Tipo'}</th>
            <th>{en ? 'Purpose' : 'Finalità'}</th>
            <th>{en ? 'Duration' : 'Durata'}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>lang</code></td>
            <td>{en ? 'Technical, first-party' : 'Tecnico, di prima parte'}</td>
            <td>{en ? 'Remembers the chosen language (IT/EN)' : 'Ricorda la lingua scelta (IT/EN)'}</td>
            <td>{en ? '12 months' : '12 mesi'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
