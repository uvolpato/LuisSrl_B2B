'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function AccessoB2B() {
  const t = useTranslations('accesso');
  const [inviato, setInviato] = useState(false);
  const req = <span className='req'>*</span>;

  // ponytail: dimostrativo come il prototipo, nessuna chiamata server. POST al backend B2B quando l'endpoint esiste.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    setInviato(true);
  }

  return (
    <section className='section' id='accesso'>
      <div className='container'>
        <div className='access reveal'>
          <div className='access-grid'>
            <div className='access-aside'>
              <p className='eyebrow'>{t('eyebrow')}</p>
              <h2 className='h2'>{t('title')}</h2>
              <p>{t('text')}</p>
              <ol className='access-steps'>
                <li>{t('step1')}</li>
                <li>{t('step2')}</li>
                <li>{t('step3')}</li>
              </ol>
            </div>
            <form className='access-form' noValidate onSubmit={onSubmit}>
              <div className='form-grid'>
                <div className='field full'>
                  <label htmlFor='ragione'>{t('ragione')} {req}</label>
                  <input id='ragione' name='ragione' type='text' required />
                </div>
                <div className='field'>
                  <label htmlFor='piva'>{t('piva')} {req}</label>
                  <input id='piva' name='piva' type='text' required />
                </div>
                <div className='field'>
                  <label htmlFor='cf'>{t('cf')}</label>
                  <input id='cf' name='cf' type='text' />
                </div>
                <div className='field'>
                  <label htmlFor='referente'>{t('referente')} {req}</label>
                  <input id='referente' name='referente' type='text' required />
                </div>
                <div className='field'>
                  <label htmlFor='tipo'>{t('tipo')}</label>
                  <select id='tipo' name='tipo'>
                    <option value='garden'>{t('tipoGarden')}</option>
                    <option value='vivaio'>{t('tipoVivaio')}</option>
                    <option value='fiorista'>{t('tipoFiorista')}</option>
                    <option value='architetto'>{t('tipoArchitetto')}</option>
                    <option value='altro'>{t('tipoAltro')}</option>
                  </select>
                </div>
                <div className='field'>
                  <label htmlFor='email'>{t('email')} {req}</label>
                  <input id='email' name='email' type='email' required />
                </div>
                <div className='field'>
                  <label htmlFor='telefono'>{t('telefono')}</label>
                  <input id='telefono' name='telefono' type='tel' />
                </div>
                <div className='field'>
                  <label htmlFor='citta'>{t('citta')}</label>
                  <input id='citta' name='citta' type='text' placeholder={t('cittaPlaceholder')} />
                </div>
                <div className='field full'>
                  <label htmlFor='messaggio'>{t('messaggio')}</label>
                  <textarea id='messaggio' name='messaggio' placeholder={t('messaggioPlaceholder')} />
                </div>
                <label className='check' htmlFor='privacy'>
                  <input id='privacy' name='privacy' type='checkbox' required />
                  <span>{t.rich('privacy', { link: (c) => <a href='#'>{c}</a> })} {req}</span>
                </label>
                <div className={inviato ? 'form-ok show' : 'form-ok'} role='status'>
                  {t('ok')}
                </div>
                <div className='form-foot'>
                  <button className='btn btn-primary btn-arrow' type='submit' disabled={inviato}>{t('invia')}</button>
                  <span className='form-note'>{t('nota')}</span>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
