import { mittenteEmail } from './mail.service';

describe('mittenteEmail', () => {
  it('rispetta un mittente già configurato con nome', () => {
    expect(mittenteEmail('Luis S.r.l. <info@luisbg.it>', 'x@y.z')).toBe('Luis S.r.l. <info@luisbg.it>');
    expect(mittenteEmail('No Reply - Gestione Ordini <ugo.volpato.001@gmail.com>', null)).toBe(
      'No Reply - Gestione Ordini <ugo.volpato.001@gmail.com>',
    );
  });

  it('aggiunge il nome aziendale a un indirizzo nudo', () => {
    expect(mittenteEmail('ugo.volpato.001@gmail.com', null)).toBe('Luis S.r.l. <ugo.volpato.001@gmail.com>');
  });

  it('senza SMTP_FROM usa l account SMTP, non un dominio inventato', () => {
    expect(mittenteEmail(undefined, 'ugo.volpato.001@gmail.com')).toBe('Luis S.r.l. <ugo.volpato.001@gmail.com>');
    expect(mittenteEmail('  ', '')).toBe('Luis S.r.l. <noreply@luisbg.it>');
  });
});
