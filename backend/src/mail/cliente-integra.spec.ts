import { boxClienteIntegra } from './cliente-integra';

describe('boxClienteIntegra', () => {
  it('cliente esistente: dice codice e che non serve il file anagrafica', () => {
    const html = boxClienteIntegra(
      { codiceCliente: '00802', email: 'a@b.it' },
      'trovato',
    );
    expect(html).toContain('Cliente già censito in Integra');
    expect(html).toContain('codice 00802');
    expect(html).toContain('a@b.it');
    expect(html).toContain('nessun file anagrafica');
  });

  it('cliente esistente senza email: lo dice', () => {
    const html = boxClienteIntegra(
      { codiceCliente: '00802', email: null },
      'trovato',
    );
    expect(html).toContain('nessuna email in Integra');
  });

  it('nuovo cliente e verifica non disponibile sono due messaggi diversi', () => {
    expect(boxClienteIntegra(null, 'assente')).toContain('Nuovo cliente');
    expect(boxClienteIntegra(null, 'non_disponibile')).toContain(
      'Verifica Integra non disponibile',
    );
  });

  it('i valori di Integra vengono escapati', () => {
    const html = boxClienteIntegra(
      { codiceCliente: '<b>1</b>', email: 'x@y.it' },
      'trovato',
    );
    expect(html).not.toContain('<b>1</b>');
    expect(html).toContain('&lt;b&gt;1&lt;/b&gt;');
  });
});
