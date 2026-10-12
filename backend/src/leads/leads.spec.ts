import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadsController } from './leads.controller';
import type { LeadsService } from './leads.service';

const valido = {
  ragioneSociale: 'Fioreria Test srl',
  partitaIva: '01234567890',
  referente: 'Mario Rossi',
  email: 'mario@example.com',
  lingua: 'it',
  privacy: true,
};

const errori = (o: object) =>
  validateSync(plainToInstance(CreateLeadDto, o)).map((e) => e.property);

describe('Lead pubblico (vetrina)', () => {
  it('accetta una richiesta valida', () => {
    expect(errori(valido)).toEqual([]);
  });

  it('rifiuta privacy non accettata, P.IVA e email non valide, lingua ignota', () => {
    expect(errori({ ...valido, privacy: false })).toEqual(['privacy']);
    expect(errori({ ...valido, privacy: 'true' })).toEqual(['privacy']);
    expect(errori({ ...valido, partitaIva: '123' })).toEqual(['partitaIva']);
    expect(errori({ ...valido, email: 'non-email' })).toEqual(['email']);
    expect(errori({ ...valido, lingua: 'fr' })).toEqual(['lingua']);
    expect(errori({ ...valido, tipoAttivita: '<script>' })).toEqual([
      'tipoAttivita',
    ]);
  });

  it('honeypot compilato: risponde ok ma non salva', async () => {
    const crea = jest.fn();
    const ctrl = new LeadsController({ crea } as unknown as LeadsService);
    const req = { ip: '1.2.3.4', get: () => 'bot' } as never;
    await expect(
      ctrl.crea({ ...valido, sito: 'http://spam' } as CreateLeadDto, req),
    ).resolves.toEqual({ ok: true });
    expect(crea).not.toHaveBeenCalled();
    await ctrl.crea(valido as CreateLeadDto, req);
    expect(crea).toHaveBeenCalledWith(
      expect.objectContaining({ partitaIva: '01234567890' }),
      '1.2.3.4',
      'bot',
    );
  });
});
