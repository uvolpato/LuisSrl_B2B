import { useTranslations } from 'next-intl';
import type { Componente } from '@/lib/api';

/** Tabella dei pezzi di un kit: i figli non si ordinano da soli, prezzo e giacenza sono del padre. */
export default function Composizione({ codice, componenti }: { codice: string; componenti: Componente[] }) {
  const t = useTranslations('catalogo');
  if (!componenti.length) return null;
  return (
    <div className='comp-wrap'>
      <table className='comp-table'>
        <caption>
          {t('composizione')} · {codice}
        </caption>
        <thead>
          <tr>
            <th scope='col'>{t('codice')}</th>
            <th scope='col'>{t('dimensioni')}</th>
            <th scope='col'>{t('qta')}</th>
          </tr>
        </thead>
        <tbody>
          {componenti.map((c) => (
            <tr key={c.codice}>
              <td>{c.codice}</td>
              <td>{c.dimensioni || '—'}</td>
              <td>{c.quantita}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
