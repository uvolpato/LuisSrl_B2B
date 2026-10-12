import {
  calcolaVerdetto,
  pivaItalianaValida,
  parseIndirizzoVies,
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

  it('ricava la sede dall indirizzo VIES', () => {
    expect(parseIndirizzoVies('VIA STATALE 47 \n23881 AIRUNO LC\n')).toEqual({
      indirizzo: 'VIA STATALE 47',
      cap: '23881',
      citta: 'AIRUNO',
      provincia: 'LC',
    });
    expect(
      parseIndirizzoVies('VIA FRANCESCO BELLAFINO 30 \n24126 BERGAMO BG\n')
        ?.citta,
    ).toBe('BERGAMO');
    expect(parseIndirizzoVies('---')).toBeNull();
    expect(parseIndirizzoVies(null)).toBeNull();
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
