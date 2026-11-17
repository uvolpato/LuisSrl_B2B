import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { FatturazioneDto } from './dto/fatturazione.dto';
import { confermaRichiesta, erroreCanaleSdi } from './fatturazione';
import {
  anagraficaDaCliente,
  valoriCliente,
} from '../leads/export-cliente';

const ok = {
  ragioneSociale: 'Garden Demo srl',
  indirizzo: 'Via Statale 47',
  cap: '23881',
  citta: 'Airuno',
  provincia: 'lc',
  codiceSdi: 'M5UXCR1',
};
const errori = (o: object) =>
  validateSync(plainToInstance(FatturazioneDto, o)).map((e) => e.property);

describe('Dati di fatturazione al primo ordine', () => {
  it('serve SDI oppure PEC; SDI 0000000 solo con PEC', () => {
    expect(erroreCanaleSdi('M5UXCR1', null)).toBeNull();
    expect(erroreCanaleSdi(null, 'fatture@pec.example')).toBeNull();
    expect(erroreCanaleSdi('', '')).toBe('fatturazione.sdi_o_pec');
    expect(erroreCanaleSdi('0000000', null)).toBe(
      'fatturazione.pec_obbligatoria',
    );
    expect(erroreCanaleSdi('0000000', 'fatture@pec.example')).toBeNull();
  });

  it('conferma richiesta solo ai clienti nati da lead e una volta sola', () => {
    expect(
      confermaRichiesta({ leadId: 3, datiFatturazioneConfermatiIl: null }),
    ).toBe(true);
    expect(
      confermaRichiesta({
        leadId: 3,
        datiFatturazioneConfermatiIl: new Date(),
      }),
    ).toBe(false);
    expect(
      confermaRichiesta({ leadId: null, datiFatturazioneConfermatiIl: null }),
    ).toBe(false);
  });

  it('formati: CAP, provincia, SDI, PEC, codice fiscale', () => {
    expect(errori(ok)).toEqual([]);
    expect(errori({ ...ok, cap: '2388' })).toEqual(['cap']);
    expect(errori({ ...ok, provincia: 'LEC' })).toEqual(['provincia']);
    expect(errori({ ...ok, codiceSdi: 'ABC' })).toEqual(['codiceSdi']);
    expect(errori({ ...ok, pec: 'non-una-mail' })).toEqual(['pec']);
    expect(errori({ ...ok, codiceFiscale: 'RSSMRA80A01H501U' })).toEqual([]);
    expect(errori({ ...ok, codiceFiscale: '123' })).toEqual(['codiceFiscale']);
  });

  it('la riesportazione porta codice cliente e P.IVA nel tracciato', () => {
    const r = valoriCliente(
      anagraficaDaCliente({
        codiceCliente: '07420',
        ragioneSociale: 'Garden Demo srl',
        nome: 'x',
        partitaIva: 'IT09012345678',
        codiceFiscale: null,
        indirizzo: 'Via Statale 47',
        cap: '23881',
        citta: 'Airuno',
        provincia: 'LC',
        telefono: null,
        email: 'info@garden-demo.example',
        pec: null,
        codiceSdi: 'M5UXCR1',
      }),
    );
    expect(r.cla_codstr).toBe('07420');
    expect(r.cla_clipiva).toBe('09012345678');
    // SDI/PEC non hanno colonna in questo tracciato: restano a Integra
    expect(Object.keys(r)).not.toContain('cla_clicoddest');
  });
});
