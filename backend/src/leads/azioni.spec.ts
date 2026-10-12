import { TRANSIZIONI, firma, verificaToken } from './azioni';

const SEGRETO = 'segreto-di-test';
const ora = 1_800_000_000_000;
const link = (a: 'approva' | 'verifica' | 'scarta', e = ora + 1000) => ({
  l: '7',
  a,
  e: String(e),
  s: firma(7, a, e, SEGRETO),
});

describe('Link firmati pulsanti lead', () => {
  it('accetta un link integro e non scaduto', () => {
    expect(verificaToken(link('approva'), SEGRETO, ora)).toEqual({
      ok: true,
      leadId: 7,
      azione: 'approva',
    });
  });

  it('rifiuta link alterati: altro lead, altra azione, firma o segreto diversi', () => {
    expect(verificaToken({ ...link('scarta'), l: '8' }, SEGRETO, ora).ok).toBe(
      false,
    );
    expect(
      verificaToken({ ...link('scarta'), a: 'approva' }, SEGRETO, ora).ok,
    ).toBe(false);
    expect(
      verificaToken({ ...link('scarta'), s: 'a'.repeat(64) }, SEGRETO, ora).ok,
    ).toBe(false);
    expect(verificaToken(link('scarta'), 'altro-segreto', ora).ok).toBe(false);
    expect(
      verificaToken({ l: '7', a: 'cancella', e: '1', s: 'x' }, SEGRETO, ora).ok,
    ).toBe(false);
  });

  it("rifiuta un link scaduto (anche se la firma e' valida)", () => {
    expect(verificaToken(link('approva', ora - 1), SEGRETO, ora)).toEqual({
      ok: false,
      motivo: 'scaduto',
    });
  });

  it('approva e scarta sono finali; verifica solo da NUOVO', () => {
    expect(TRANSIZIONI.approva.da).not.toContain('APPROVATO');
    expect(TRANSIZIONI.approva.da).not.toContain('SCARTATO');
    expect(TRANSIZIONI.scarta.da).not.toContain('APPROVATO');
    expect(TRANSIZIONI.verifica.da).toEqual(['NUOVO']);
  });
});
