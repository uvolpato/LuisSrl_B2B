'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { inviaRichiestaAccesso, type EsitoRichiesta } from '@/lib/richiedi-accesso';

export default function AccessoB2B() {
  const t = useTranslations('accesso');
  const [esito, setEsito] = useState<EsitoRichiesta | 'invio' | null>(null);
  const inviato = esito === 'ok';
  const req = <span className='req'>*</span>;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    setEsito('invio');
    setEsito(await inviaRichiestaAccesso(new FormData(form)));
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
                  <input id='ragione' name='ragioneSociale' type='text' required minLength={2} maxLength={200} autoComplete='organization' />
                </div>
                <div className='field'>
                  <label htmlFor='piva'>{t('piva')} {req}</label>
                  <input id='piva' name='partitaIva' type='text' required pattern='[0-9]{11}|[A-Za-z]{2}[0-9A-Za-z]{2,13}' title={t('pivaFormato')} maxLength={15} />
                </div>
                <div className='field'>
                  <label htmlFor='cf'>{t('cf')}</label>
                  <input id='cf' name='codiceFiscale' type='text' pattern='[0-9A-Za-z]{11,16}' maxLength={16} />
                </div>
                <div className='field'>
                  <label htmlFor='referente'>{t('referente')} {req}</label>
                  <input id='referente' name='referente' type='text' required minLength={2} maxLength={120} autoComplete='name' />
                </div>
                <div className='field'>
                  <label htmlFor='tipo'>{t('tipo')}</label>
                  <select id='tipo' name='tipoAttivita'>
                    <option value='garden'>{t('tipoGarden')}</option>
                    <option value='vivaio'>{t('tipoVivaio')}</option>
                    <option value='fiorista'>{t('tipoFiorista')}</option>
                    <option value='architetto'>{t('tipoArchitetto')}</option>
                    <option value='altro'>{t('tipoAltro')}</option>
                  </select>
                </div>
                <div className='field'>
                  <label htmlFor='email'>{t('email')} {req}</label>
                  <input id='email' name='email' type='email' required maxLength={200} autoComplete='email' />
                </div>
                <div className='field'>
                  <label htmlFor='telefono'>{t('telefono')}</label>
                  <input id='telefono' name='telefono' type='tel' pattern='[0-9 +()./\-]{5,30}' maxLength={30} autoComplete='tel' />
                </div>
                <div className='field'>
                  <label htmlFor='citta'>{t('citta')}</label>
                  <input id='citta' name='citta' type='text' maxLength={120} placeholder={t('cittaPlaceholder')} />
                </div>
                <div className='field full'>
                  <label htmlFor='messaggio'>{t('messaggio')}</label>
                  <textarea id='messaggio' name='messaggio' maxLength={2000} placeholder={t('messaggioPlaceholder')} />
                </div>
                <label className='check' htmlFor='privacy'>
                  <input id='privacy' name='privacy' type='checkbox' required />
                  <span>{t.rich('privacy', { link: (c) => <a href='#'>{c}</a> })} {req}</span>
                </label>
                {/* Honeypot anti-spam: invisibile agli umani, i bot lo compilano. */}
                <div className='hp' aria-hidden='true'>
                  <label htmlFor='sito'>Sito</label>
                  <input id='sito' name='sito' type='text' tabIndex={-1} autoComplete='off' />
                </div>
                <div className={inviato ? 'form-ok show' : 'form-ok'} role='status'>
                  {t('ok')}
                </div>
                {esito && esito !== 'ok' && esito !== 'invio' && (
                  <div className='form-err' role='alert'>{t(`err_${esito}`)}</div>
                )}
                <div className='form-foot'>
                  <button className='btn btn-primary btn-arrow' type='submit' disabled={inviato || esito === 'invio'}>{esito === 'invio' ? t('invio') : t('invia')}</button>
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
