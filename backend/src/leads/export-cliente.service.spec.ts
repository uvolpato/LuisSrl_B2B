import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import type { Lead } from '@prisma/client';
import { ExportClienteService } from './export-cliente.service';

// Lead fittizio: nessun soggetto reale.
const lead = {
  id: 9,
  ragioneSociale: 'Garden Demo srl',
  partitaIva: '09012345678',
  codiceFiscale: null,
  telefono: '039 1234567',
  email: 'Info@Garden-Demo.example',
  sedeIndirizzo: 'VIA STATALE 47',
  sedeCap: '23881',
  sedeCitta: 'AIRUNO',
  sedeProvincia: 'LC',
  esportatoIl: null,
  esportatoFile: null,
} as unknown as Lead;

const prismaFinto = () => ({
  lead: { update: jest.fn().mockResolvedValue({}) },
  leadEvent: { create: jest.fn().mockResolvedValue({}) },
});

describe('ExportClienteService', () => {
  let dir: string;
  const precedente = process.env.IMPORT_CLIENTI_DIR;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'lead-svc-'));
    process.env.IMPORT_CLIENTI_DIR = dir;
  });
  afterEach(async () => {
    if (precedente === undefined) delete process.env.IMPORT_CLIENTI_DIR;
    else process.env.IMPORT_CLIENTI_DIR = precedente;
    await rm(dir, { recursive: true, force: true });
  });

  it('senza forza non riscrive un lead gia esportato', async () => {
    const svc = new ExportClienteService(prismaFinto() as never);
    const r = await svc.esporta({ ...lead, esportatoFile: 'lead-9-VECCHIO.xlsx' } as Lead);
    expect(r).toMatchObject({ ok: true, file: 'lead-9-VECCHIO.xlsx', giaEsportato: true });
    expect(await readdir(dir)).toEqual([]);
  });

  it('con forza rigenera il file e toglie quello col nome precedente', async () => {
    const prisma = prismaFinto();
    const svc = new ExportClienteService(prisma as never);
    await writeFile(path.join(dir, 'lead-9-VECCHIA-RAGIONE.xlsx'), 'vecchio');

    const r = await svc.esporta({ ...lead, esportatoFile: 'lead-9-VECCHIA-RAGIONE.xlsx' } as Lead, { forza: true });

    expect(r).toMatchObject({ ok: true, file: 'lead-9-GARDEN-DEMO-SRL.xlsx', giaEsportato: false });
    expect(await readdir(dir)).toEqual(['lead-9-GARDEN-DEMO-SRL.xlsx']);
    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 9 } }),
    );
  });

  it('non scrive il file se manca un campo obbligatorio', async () => {
    const svc = new ExportClienteService(prismaFinto() as never);
    const r = await svc.esporta({ ...lead, sedeProvincia: null } as Lead);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.errore).toContain('cla_cliprov');
    expect(await readdir(dir)).toEqual([]);
  });
});
