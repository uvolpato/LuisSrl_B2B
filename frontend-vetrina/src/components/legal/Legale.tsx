/** Impaginazione comune di Privacy e Cookie policy (stile sito vetrina). */
export function Documento({ eyebrow, titolo, aggiornato, children }: { eyebrow: string; titolo: string; aggiornato: string; children: React.ReactNode }) {
  return (
    <main className='section legal'>
      <div className='container'>
        <p className='eyebrow'>{eyebrow}</p>
        <h1 className='h1' style={{ fontSize: 'clamp(32px,4.6vw,48px)' }}>{titolo}</h1>
        <p className='legal-meta'>{aggiornato}</p>
        <div className='legal-body'>{children}</div>
      </div>
    </main>
  );
}

/** Punto ancora da confermare con il titolare: evidenziato finche' la bozza non e' validata. */
export const Da = ({ children }: { children: React.ReactNode }) => <mark className='legal-todo'>{children}</mark>;
