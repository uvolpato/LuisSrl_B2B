import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminLeadsService } from './admin-leads.service';

function crea(lead: unknown) {
  const prisma = {
    lead: {
      findUnique: jest.fn().mockResolvedValue(lead),
      update: jest.fn().mockResolvedValue({}),
    },
    customer: { update: jest.fn().mockResolvedValue({}) },
    leadEvent: { create: jest.fn().mockResolvedValue({}) },
  };
  const svc = new AdminLeadsService(
    prisma as never,
    { cercaPerPiva: jest.fn() } as never,
    { riesportaCliente: jest.fn() } as never,
  );
  return { svc, prisma };
}

describe('Email di accesso scelta a mano', () => {
  it('salva sul lead e aggiorna il cliente collegato', async () => {
    const { svc, prisma } = crea({
      id: 7,
      anonimizzatoIl: null,
      cliente: { id: 3 },
    });

    await expect(svc.setEmailAccesso(7, ' Capo@Azienda.it ')).resolves.toEqual({
      emailAccesso: 'capo@azienda.it',
    });
    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { emailAccesso: 'capo@azienda.it' },
    });
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { email: 'capo@azienda.it' },
    });
    expect(prisma.leadEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ leadId: 7, tipo: 'email_scelta' }),
    });
  });

  it('null riporta a "automatica" e non tocca il cliente', async () => {
    const { svc, prisma } = crea({
      id: 7,
      anonimizzatoIl: null,
      cliente: { id: 3 },
    });

    await svc.setEmailAccesso(7, null);

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { emailAccesso: null },
    });
    expect(prisma.customer.update).not.toHaveBeenCalled();
  });

  it('richiesta inesistente o anonimizzata: rifiuta', async () => {
    await expect(
      crea(null).svc.setEmailAccesso(7, 'a@b.it'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      crea({
        id: 7,
        anonimizzatoIl: new Date(),
        cliente: null,
      }).svc.setEmailAccesso(7, 'a@b.it'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
