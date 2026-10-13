import { FILTRI_STATO, giorniAttesa } from './admin-leads';

describe('Area admin Richieste accesso', () => {
  const ora = new Date('2026-10-13T12:00:00Z');

  it('attesa in giorni interi solo per le richieste da decidere', () => {
    expect(
      giorniAttesa('IN_VALUTAZIONE', new Date('2026-10-02T09:12:00Z'), ora),
    ).toBe(11);
    expect(giorniAttesa('NUOVO', new Date('2026-10-13T08:00:00Z'), ora)).toBe(
      0,
    );
    expect(
      giorniAttesa('APPROVATO', new Date('2026-10-01T08:00:00Z'), ora),
    ).toBeNull();
  });

  it('filtro predefinito "da decidere" = nuove + in verifica; "tutti" senza vincolo', () => {
    expect(FILTRI_STATO['da-decidere']).toEqual(['NUOVO', 'IN_VALUTAZIONE']);
    expect(FILTRI_STATO.tutti).toBeNull();
  });
});
