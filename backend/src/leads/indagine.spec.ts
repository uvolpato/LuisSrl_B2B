import {
  calcolaVerdetto,
  pivaItalianaValida,
  scomponiPiva,
  type Segnale,
  type StatoSegnale,
} from './indagine';

const seg = (
  stati: Partial<Record<Segnale['chiave'], StatoSegnale>>,
): Segnale[] =>
  (['partitaIva', 'sitoWeb', 'email', 'presenzaWeb', 'coerenza'] as const).map(
    (chiave) => ({
      chiave,
      etichetta: chiave,
      stato: stati[chiave] ?? 'NON_VERIFICATO',
      nota: '',
      fonti: [],
    }),
  );

describe('Qualifica lead — logica pura', () => {
  it('checksum P.IVA italiana', () => {
    expect(pivaItalianaValida('04253020160')).toBe(true); // Luis S.r.l.
    expect(pivaItalianaValida('04253020161')).toBe(false);
    expect(pivaItalianaValida('00000000000')).toBe(false);
    expect(pivaItalianaValida('1234')).toBe(false);
  });

  it('scompone P.IVA IT ed estere', () => {
    expect(scomponiPiva('04253020160')).toEqual({
      paese: 'IT',
      numero: '04253020160',
    });
    expect(scomponiPiva('de123456789')).toEqual({
      paese: 'DE',
      numero: '123456789',
    });
    expect(scomponiPiva('12-34')).toBeNull();
  });

  it('BUONO solo con P.IVA confermata + presenza web + email non usa-e-getta', () => {
    expect(
      calcolaVerdetto(
        seg({
          partitaIva: 'CONFERMATO',
          sitoWeb: 'CONFERMATO',
          email: 'NEUTRO',
        }),
      ).verdetto,
    ).toBe('BUONO');
    expect(
      calcolaVerdetto(
        seg({
          partitaIva: 'CONFERMATO',
          presenzaWeb: 'CONFERMATO',
          coerenza: 'NEGATIVO',
        }),
      ).verdetto,
    ).toBe('VERIFICARE');
    expect(
      calcolaVerdetto(seg({ partitaIva: 'NEUTRO', sitoWeb: 'CONFERMATO' }))
        .verdetto,
    ).toBe('VERIFICARE');
  });

  it('SCARTARE su P.IVA negativa o email usa-e-getta senza presenza web', () => {
    expect(
      calcolaVerdetto(seg({ partitaIva: 'NEGATIVO', sitoWeb: 'CONFERMATO' }))
        .verdetto,
    ).toBe('SCARTARE');
    expect(
      calcolaVerdetto(seg({ partitaIva: 'CONFERMATO', email: 'NEGATIVO' }))
        .verdetto,
    ).toBe('SCARTARE');
    expect(
      calcolaVerdetto(
        seg({
          partitaIva: 'CONFERMATO',
          email: 'NEGATIVO',
          sitoWeb: 'CONFERMATO',
        }),
      ).verdetto,
    ).toBe('VERIFICARE');
  });

  it('fail closed: tutto non verificato → VERIFICARE', () => {
    expect(calcolaVerdetto(seg({})).verdetto).toBe('VERIFICARE');
  });
});
