import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { FatturazioneDto } from './dto/fatturazione.dto';
import { confermaRichiesta, erroreCanaleSdi } from './fatturazione';
import {
  COLONNE_CLIENTI,
  anagraficaDaCliente,
  rigaCliente,
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

  it('la riesportazione porta codice cliente, SDI e PEC nel tracciato', () => {
    const r = rigaCliente(
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
    const v = (c: (typeof COLONNE_CLIENTI)[number]) =>
      r[COLONNE_CLIENTI.indexOf(c)];
    expect(v('CLA_CODSTR')).toBe('07420');
    expect(v('CLA_CLICODDEST')).toBe('M5UXCR1');
    expect(v('CLA_CLIPIVA')).toBe('09012345678');
  });
});
