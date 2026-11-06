import { sqlAggiornaClienti } from './sync-clienti-sql';

describe('sqlAggiornaClienti', () => {
  it('senza force non tocca le email scelte a mano su una richiesta', () => {
    const sql = sqlAggiornaClienti(false);
    expect(sql).toContain('leads l');
    expect(sql).toContain('l.email_accesso IS NOT NULL');
    expect(sql).toContain('THEN c.email');
  });

  it('con force riscrive l email da Integra', () => {
    const sql = sqlAggiornaClienti(true);
    expect(sql).not.toContain('email_accesso');
    expect(sql).toContain(`email = COALESCE(NULLIF(i.email, ''), c.email)`);
  });

  it('aggiorna sempre tutti gli altri campi anagrafici', () => {
    for (const force of [false, true]) {
      const sql = sqlAggiornaClienti(force);
      for (const campo of [
        'ragione_sociale',
        'partita_iva',
        'codice_listino',
        'codice_pagamento',
        'fido',
      ])
        expect(sql).toContain(campo);
    }
  });
});
