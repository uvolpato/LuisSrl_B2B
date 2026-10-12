import { getTranslations } from 'next-intl/server';

export default async function Contatti() {
  const t = await getTranslations('contatti');

  return (
    <section className='section' id='contatti'>
      <div className='container contact-grid'>
        <div className='reveal'>
          <p className='eyebrow'>{t('eyebrow')}</p>
          <h2 className='h2'>{t('title')}</h2>
          <p className='lead' style={{ marginTop: 14 }}>{t('lead')}</p>
        </div>
        <ul className='contact-list reveal' style={{ '--d': '120ms' } as React.CSSProperties}>
          <li><span className='c-label'>{t('sede')}</span><span>{t('sedeValore')}</span></li>
          <li><span className='c-label'>{t('telefono')}</span><span><a href='tel:+390350521957'>+39 035 0521957</a></span></li>
          <li><span className='c-label'>{t('cellulare')}</span><span><a href='tel:+393337068987'>+39 333 7068987</a></span></li>
          <li><span className='c-label'>{t('email')}</span><span><a href='mailto:contatti@luisbg.it'>contatti@luisbg.it</a></span></li>
          <li><span className='c-label'>{t('social')}</span><span><a href='#'>WhatsApp</a> · <a href='#'>Instagram</a></span></li>
        </ul>
      </div>
    </section>
  );
}
