import { AdminLeadsService } from './admin-leads.service';

const prismaFinto = () => ({
  lead: {
    findUnique: jest
      .fn()
      .mockResolvedValue({ id: 5, anonimizzatoIl: null, cliente: null }),
    update: jest.fn().mockResolvedValue({}),
  },
  customer: { update: jest.fn().mockResolvedValue({}) },
  leadEvent: { create: jest.fn().mockResolvedValue({}) },
});

const sede = {
  indirizzo: ' via  roma 1 ',
  cap: ' 84047 ',
  citta: 'capaccio paestum',
  provincia: 'sa',
};

describe('AdminLeadsService.setSede', () => {
  it('normalizza e salva la sede scritta a mano', async () => {
    const prisma = prismaFinto();
    const svc = new AdminLeadsService(
      prisma as never,
      {} as never,
      {} as never,
    );

    const r = await svc.setSede(5, sede);

    expect(r).toEqual({
      sedeIndirizzo: 'VIA ROMA 1',
      sedeCap: '84047',
      sedeCitta: 'CAPACCIO PAESTUM',
      sedeProvincia: 'SA',
      sedeFonte: 'MANUALE',
    });
    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: r,
    });
    expect(prisma.leadEvent.create).toHaveBeenCalled();
  });

  it('non tocca una richiesta anonimizzata', async () => {
    const prisma = prismaFinto();
    prisma.lead.findUnique.mockResolvedValue({
      id: 5,
      anonimizzatoIl: new Date(),
      cliente: null,
    });
    const svc = new AdminLeadsService(
      prisma as never,
      {} as never,
      {} as never,
    );

    await expect(svc.setSede(5, sede)).rejects.toThrow();
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });
});
