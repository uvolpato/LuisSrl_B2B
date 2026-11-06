import { AggancioLeadService, type EsitoRicerca } from './aggancio.service';

const lead = {
  id: 7,
  partitaIva: '01234567890',
  codiceFiscale: null,
  email: 'mario@example.com',
  emailAccesso: null,
};

const trovato = (over: Partial<EsitoRicerca> = {}): EsitoRicerca => ({
  stato: 'trovato',
  codiceCliente: '00802',
  email: 'info@integratio.it',
  fonte: 'copia',
  ...over,
});

function crea(
  opts: {
    gia?: unknown;
    cliente?: unknown;
    live?: jest.Mock;
    copia?: jest.Mock;
    invita?: jest.Mock;
    importa?: jest.Mock;
  } = {},
) {
  const prisma = {
    // Integra live non raggiungibile di default (si usa la copia locale).
    $transaction:
      opts.live ?? jest.fn().mockRejectedValue(new Error('integra_server')),
    $queryRaw: opts.copia ?? jest.fn().mockResolvedValue([]),
    $executeRawUnsafe: jest.fn(),
    customer: {
      findUnique: jest
        .fn()
        .mockResolvedValueOnce(opts.gia ?? null)
        .mockResolvedValueOnce(
          opts.cliente === undefined
            ? { id: 1, invitatoAt: null, codiceFiscale: null }
            : opts.cliente,
        ),
      update: jest.fn().mockResolvedValue({}),
    },
    leadEvent: {
      create: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
    },
  };
  const importa = opts.importa ?? jest.fn().mockResolvedValue({ creati: 1 });
  const invita = opts.invita ?? jest.fn().mockResolvedValue({});
  const svc = new AggancioLeadService(
    prisma as never,
    { importaClienti: importa } as never,
    { invita } as never,
  );
  return { svc, prisma, importa, invita };
}

const tipi = (prisma: { leadEvent: { create: jest.Mock } }) =>
  prisma.leadEvent.create.mock.calls.map(
    (c: { data: { tipo: string } }[]) => c[0].data.tipo,
  );

describe('Aggancio del lead approvato', () => {
  it('importa, collega e invita il cliente gia in Integra', async () => {
    const { svc, prisma, importa, invita } = crea();

    const esito = await svc.agganciaLead(lead, trovato());

    expect(esito).toEqual({ collegato: true, invitato: true });
    // Integra ha l'email: nessun override.
    expect(importa).toHaveBeenCalledWith(['00802'], undefined);
    expect(invita).toHaveBeenCalledWith(null, 1, undefined);
    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ leadId: 7 }) }),
    );
    expect(tipi(prisma)).toEqual(
      expect.arrayContaining(['cliente_collegato', 'invito_inviato']),
    );
  });

  it('Integra senza email: usa quella della richiesta', async () => {
    const { svc, importa } = crea();

    await svc.agganciaLead(lead, trovato({ email: null }));

    expect(importa).toHaveBeenCalledWith(['00802'], {
      '00802': 'mario@example.com',
    });
  });

  it("email scelta a mano: l'import usa quella", async () => {
    const { svc, importa } = crea();

    await svc.agganciaLead(
      { ...lead, emailAccesso: 'capo@azienda.it' },
      trovato(),
    );

    expect(importa).toHaveBeenCalledWith(['00802'], {
      '00802': 'capo@azienda.it',
    });
  });

  it('cliente gia invitato: nessun secondo invito', async () => {
    const { svc, invita } = crea({
      cliente: { id: 1, invitatoAt: new Date(), codiceFiscale: null },
    });

    const esito = await svc.agganciaLead(lead, trovato());

    expect(esito).toEqual({ collegato: true, invitato: true });
    expect(invita).not.toHaveBeenCalled();
  });

  it("invito fallito: cliente collegato ma esito dice che l'email non e' partita", async () => {
    const { svc, prisma } = crea({
      invita: jest.fn().mockRejectedValue(new Error('SMTP 550')),
    });

    const esito = await svc.agganciaLead(lead, trovato());

    expect(esito).toEqual({ collegato: true, invitato: false });
    expect(tipi(prisma)).toContain('invito_errore');
  });

  it('P.IVA gia collegata a un altro lead: conflitto, nessun import', async () => {
    const { svc, prisma, importa } = crea({
      gia: { id: 1, leadId: 99, invitatoAt: null, codiceFiscale: null },
    });

    const esito = await svc.agganciaLead(lead, trovato());

    expect(esito).toEqual({
      collegato: false,
      invitato: false,
      motivo: 'conflitto',
    });
    expect(importa).not.toHaveBeenCalled();
    expect(tipi(prisma)).toContain('aggancio_conflitto');
  });

  it('P.IVA assente in Integra e nella copia: niente import', async () => {
    const { svc, importa } = crea({ copia: jest.fn().mockResolvedValue([]) });

    const esito = await svc.agganciaLead(lead);

    expect(esito).toEqual({
      collegato: false,
      invitato: false,
      motivo: 'non_trovato',
    });
    expect(importa).not.toHaveBeenCalled();
  });
});
