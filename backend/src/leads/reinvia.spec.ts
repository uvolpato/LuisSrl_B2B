import { ConflictException, NotFoundException } from '@nestjs/common';
import { LeadsService } from './leads.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { MailService } from '../mail/mail.service';
import type { IndagineService } from './indagine.service';
import type { AzioniLeadService } from './azioni.service';

const lead = {
  id: 7,
  createdAt: new Date('2026-11-02T09:00:00Z'),
  ragioneSociale: 'Fioreria Test srl',
  partitaIva: '01234567890',
  codiceFiscale: null,
  referente: 'Mario Rossi',
  tipoAttivita: 'fiorista',
  email: 'mario@example.com',
  telefono: null,
  citta: null,
  messaggio: null,
  lingua: 'it',
  privacyAccettataIl: new Date('2026-11-02T09:00:00Z'),
  privacyVersione: '2026-10',
  ip: null,
  userAgent: null,
  stato: 'NUOVO',
  verdetto: null,
  report: null,
  indagineIl: null,
  decisioneIl: null,
  sedeIndirizzo: null,
  sedeCap: null,
  sedeCitta: null,
  sedeProvincia: null,
  sedeFonte: null,
  esportatoIl: null,
  esportatoFile: null,
  anonimizzatoIl: null,
};

function crea(over: Record<string, unknown> = {}) {
  const prisma = {
    lead: { findUnique: jest.fn().mockResolvedValue({ ...lead, ...over }) },
    leadEvent: { create: jest.fn().mockResolvedValue({}) },
  };
  const mail = {
    sendConfermaLead: jest.fn().mockResolvedValue(undefined),
    sendSegnalazioneLead: jest.fn().mockResolvedValue(undefined),
  };
  const azioni = { link: jest.fn().mockReturnValue({}) };
  const aggancio = {
    cercaPerPiva: jest.fn().mockResolvedValue({ stato: 'assente' }),
  };
  const svc = new LeadsService(
    prisma as unknown as PrismaService,
    mail as unknown as MailService,
    {} as IndagineService,
    azioni as unknown as AzioniLeadService,
    aggancio as never,
  );
  return { svc, prisma, mail, aggancio };
}

describe('Reinvio manuale email richiesta accesso', () => {
  it('reinvio conferma: invia e registra l’evento manuale', async () => {
    const { svc, mail, prisma } = crea();
    await expect(svc.reinvia(7, 'conferma')).resolves.toEqual({
      esito: 'inviata',
    });
    expect(mail.sendConfermaLead).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, email: 'mario@example.com' }),
    );
    expect(prisma.leadEvent.create).toHaveBeenCalledWith({
      data: { leadId: 7, tipo: 'conferma_inviata', dettagli: { manuale: true } },
    });
  });

  it('errore SMTP: risponde errore e registra l’evento, senza lanciare', async () => {
    const { svc, mail, prisma } = crea();
    mail.sendSegnalazioneLead.mockRejectedValue(new Error('SMTP 550'));
    await expect(svc.reinvia(7, 'shop')).resolves.toEqual({
      esito: 'errore',
      errore: 'SMTP 550',
    });
    // La mail a shop@ porta anche l'esito della verifica Integra.
    expect(mail.sendSegnalazioneLead).toHaveBeenCalledWith(
      expect.objectContaining({ verificaIntegra: 'assente' }),
    );
    expect(prisma.leadEvent.create).toHaveBeenCalledWith({
      data: {
        leadId: 7,
        tipo: 'mail_errore',
        dettagli: { errore: 'SMTP 550', manuale: true },
      },
    });
  });

  it('lead anonimizzato o inesistente: nessun invio', async () => {
    const anonimo = crea({ anonimizzatoIl: new Date() });
    await expect(anonimo.svc.reinvia(7, 'conferma')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(anonimo.mail.sendConfermaLead).not.toHaveBeenCalled();

    const assente = crea();
    assente.prisma.lead.findUnique.mockResolvedValue(null);
    await expect(assente.svc.reinvia(99, 'shop')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
