import { candidatoPadre, padreComponente, promptComposizione } from './componenti';

// Codici reali: `MC108886` esiste in Integra, i suoi figli hanno suffisso a 5 cifre.
const PADRI = new Set(['MC108886', 'MC108621']);
const esiste = (c: string) => PADRI.has(c);

describe('componenti (kit)', () => {
  it('riconosce i figli quando il padre esiste', () => {
    expect(padreComponente('MC108886-08611', esiste)).toBe('MC108886');
    expect(padreComponente('MC108886-08614', esiste)).toBe('MC108886');
  });

  it('ignora il trattino dei colori/varianti', () => {
    expect(padreComponente('PTD100440-61', esiste)).toBeNull();
    expect(padreComponente('AL21-19004', esiste)).toBeNull();
  });

  it('ignora i 5 numeri quando il padre non esiste', () => {
    expect(padreComponente('OA31-04030', esiste)).toBeNull();
    expect(padreComponente('MC108886-08611', () => false)).toBeNull();
  });

  it('candidatoPadre non dipende dal catalogo', () => {
    expect(candidatoPadre('MC108886-08611')).toBe('MC108886');
    expect(candidatoPadre('MC108886')).toBeNull();
    expect(candidatoPadre('MC108886-8611')).toBeNull();
  });
});

describe('promptComposizione', () => {
  it('senza componenti non aggiunge nulla al prompt', () => {
    expect(promptComposizione([{ codice: 'A' }])).toBe('');
    expect(promptComposizione([{ codice: 'A', componenti: [] }])).toBe('');
  });

  it('elenca pezzi, misure e quantità', () => {
    const testo = promptComposizione([
      {
        codice: 'MC108886',
        componenti: [
          { descrizione: 'cubo piccolo', dimensioni: '23x23 x 23', quantita: 1 },
          { descrizione: 'cubo medio', dimensioni: '28x28 x 28', quantita: 2 },
        ],
      },
      { codice: 'MC999', componenti: [] },
    ]);
    expect(testo).toContain('Kit MC108886');
    expect(testo).toContain('cubo piccolo (23x23 x 23)');
    expect(testo).toContain('2× cubo medio (28x28 x 28)');
    expect(testo).not.toContain('MC999');
  });
});
