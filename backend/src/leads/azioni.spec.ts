import type { Lead } from '@prisma/client';
import { TRANSIZIONI, firma, verificaToken } from './azioni';
import { AzioniLeadService } from './azioni.service';

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

describe('Approvazione e cliente gia in Integra', () => {
  const lead = {
    id: 7,
    ragioneSociale: 'Fioreria Test srl',
    partitaIva: '01234567890',
    email: 'mario@example.com',
  } as Lead;

  const costruisci = (esporta: jest.Mock, cercaPerPiva: jest.Mock) => {
    const prisma = {
      lead: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue(lead),
      },
      leadEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const agganciaLead = jest
      .fn()
      .mockResolvedValue({ collegato: true, invitato: true });
    const svc = new AzioniLeadService(
      prisma as never,
      { esporta } as never,
      { cercaPerPiva, agganciaLead } as never,
    );
    return { svc, prisma, agganciaLead };
  };

  it('P.IVA gia in Integra: nessun file anagrafica, segnala la differenza di email', async () => {
    const esporta = jest.fn();
    const { svc, prisma, agganciaLead } = costruisci(
      esporta,
      jest.fn().mockResolvedValue({
        stato: 'trovato',
        codiceCliente: '00123',
        email: 'ordini@example.com',
        fonte: 'integra',
      }),
    );

    const esito = await svc.applica(7, 'approva', {});

    expect(esporta).not.toHaveBeenCalled();
    // Import e invito partono subito, senza aspettare il cron.
    expect(agganciaLead).toHaveBeenCalledWith(
      lead,
      expect.objectContaining({ stato: 'trovato', codiceCliente: '00123' }),
    );
    expect(esito).toMatchObject({
      tipo: 'eseguita',
      inIntegra: true,
      aggancio: { collegato: true, invitato: true },
    });
    const tipi = prisma.leadEvent.create.mock.calls.map(
      (c: { data: { tipo: string } }[]) => c[0].data.tipo,
    );
    expect(tipi).toEqual(
      expect.arrayContaining([
        'azione_approva',
        'cliente_integra',
        'email_diversa',
      ]),
    );
  });

  it('P.IVA assente in Integra: genera il file anagrafica', async () => {
    const esporta = jest.fn().mockResolvedValue({
      ok: true,
      file: 'lead-7.xlsx',
      giaEsportato: false,
      sedeMancante: false,
    });
    const { svc } = costruisci(
      esporta,
      jest.fn().mockResolvedValue({ stato: 'assente' }),
    );

    const esito = await svc.applica(7, 'approva', {});

    expect(esporta).toHaveBeenCalledWith(lead);
    expect(esito).toMatchObject({
      tipo: 'eseguita',
      inIntegra: false,
      verificaIntegra: 'assente',
    });
  });

  it('Integra non raggiungibile: genera il file ma segnala la verifica mancata', async () => {
    const esporta = jest.fn().mockResolvedValue({
      ok: true,
      file: 'lead-7.xlsx',
      giaEsportato: false,
      sedeMancante: false,
    });
    const { svc, prisma } = costruisci(
      esporta,
      jest.fn().mockResolvedValue({ stato: 'non_disponibile' }),
    );

    const esito = await svc.applica(7, 'approva', {});

    expect(esporta).toHaveBeenCalledWith(lead);
    expect(esito).toMatchObject({
      tipo: 'eseguita',
      inIntegra: false,
      verificaIntegra: 'non_disponibile',
    });
    const tipi = prisma.leadEvent.create.mock.calls.map(
      (c: { data: { tipo: string } }[]) => c[0].data.tipo,
    );
    expect(tipi).toContain('verifica_integra_non_disponibile');
  });

  it('P.IVA in Integra senza email: usa quella della richiesta', async () => {
    const { svc, prisma } = costruisci(
      jest.fn(),
      jest.fn().mockResolvedValue({
        stato: 'trovato',
        codiceCliente: '00123',
        email: null,
        fonte: 'copia',
      }),
    );

    await svc.applica(7, 'approva', {});

    const tipi = prisma.leadEvent.create.mock.calls.map(
      (c: { data: { tipo: string } }[]) => c[0].data.tipo,
    );
    expect(tipi).toContain('email_da_richiesta');
  });
});
