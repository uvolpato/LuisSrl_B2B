import { emailAccesso } from './email-integra';

describe('emailAccesso', () => {
  it('usa quella di Integra quando c e ed e uguale (maiuscole/minuscole ignorate)', () => {
    expect(emailAccesso(' Info@Cliente.it ', 'info@cliente.it')).toEqual({
      email: 'info@cliente.it',
      diversa: false,
      daRichiesta: false,
    });
  });

  it('segnala la differenza ma tiene quella di Integra', () => {
    expect(emailAccesso('ordini@cliente.it', 'tizio@cliente.it')).toEqual({
      email: 'ordini@cliente.it',
      diversa: true,
      daRichiesta: false,
    });
  });

  it('se Integra non ha email usa quella della richiesta', () => {
    expect(emailAccesso('', 'tizio@cliente.it')).toEqual({
      email: 'tizio@cliente.it',
      diversa: false,
      daRichiesta: true,
    });
    expect(emailAccesso(null, 'tizio@cliente.it').daRichiesta).toBe(true);
  });
});
