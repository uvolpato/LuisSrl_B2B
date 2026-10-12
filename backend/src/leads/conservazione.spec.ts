import { datiAnonimi, limite, mesiConservazione } from './conservazione';

describe('Conservazione lead (GDPR)', () => {
  it('azzera i dati personali e la checklist, tiene il resto del report', () => {
    const d = datiAnonimi({
      verdetto: 'SCARTARE',
      checklist: ['email mario@x.it'],
      segnali: [],
    });
    expect(d).toMatchObject({
      referente: 'anonimizzato',
      email: 'anonimizzato',
      telefono: null,
      messaggio: null,
      ip: null,
      userAgent: null,
    });
    expect(d.report).toEqual({ verdetto: 'SCARTARE', segnali: [] });
    expect(datiAnonimi(null).report).toBeNull();
  });

  it('limite a N mesi e default 12', () => {
    expect(limite(12, new Date('2026-10-13T00:00:00Z')).toISOString()).toBe(
      '2025-10-13T00:00:00.000Z',
    );
    const prima = process.env.LEAD_RETENTION_MESI;
    process.env.LEAD_RETENTION_MESI = 'abc';
    expect(mesiConservazione()).toBe(12);
    process.env.LEAD_RETENTION_MESI = '6';
    expect(mesiConservazione()).toBe(6);
    process.env.LEAD_RETENTION_MESI = prima;
  });
});
