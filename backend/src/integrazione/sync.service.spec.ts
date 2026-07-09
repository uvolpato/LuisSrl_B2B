import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SyncService', () => {
  let service: SyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: { $queryRawUnsafe: jest.fn(), $executeRawUnsafe: jest.fn() } },
      ],
    }).compile();
    service = module.get<SyncService>(SyncService);
  });

  describe('parseNumeric', () => {
    it.each([
      [null, null],
      ['', null],
      ['42', 42],
      ['42,5', 42.5],
      ['18.5', 18.5],
      ['  3,14  ', 3.14],
      ['abc', null],
    ])('parseNumeric(%p) = %p', (input, expected) => {
      expect((service as any).parseNumeric(input)).toBe(expected);
    });
  });

  describe('parseDimensione', () => {
    it('restituisce null quando entrambi vuoti', () => {
      expect((service as any).parseDimensione(null, null)).toEqual({ json: null, testo: null });
    });
    it('parsa singolo numero come diametro', () => {
      const res = (service as any).parseDimensione('18', null);
      expect(res.testo).toBe('18');
      expect(res.json).toEqual({ diametro: 18 });
    });
    it('parsa "18x27" come larghezza/lunghezza', () => {
      const res = (service as any).parseDimensione('18x27', null);
      expect(res.testo).toBe('18x27');
      expect(res.json).toEqual({ larghezza: 18, lunghezza: 27 });
    });
    it('parsa diametro + altezza', () => {
      const res = (service as any).parseDimensione('18', '30');
      expect(res.testo).toBe('18 x 30');
      expect(res.json).toEqual({ diametro: 18, altezza: 30 });
    });
    it('gestisce virgola decimale', () => {
      const res = (service as any).parseDimensione('18,5', '30,2');
      expect(res.json).toEqual({ diametro: 18.5, altezza: 30.2 });
    });
  });

  describe('parseRows', () => {
    it('estrae famiglie dalla chiave numerica cod_famiglia', () => {
      const rows = [
        { pro_cod: 'FAM_VASI_COTTO', pro_descr: 'Vasi in Cotto', cod_famiglia: '10', cod_linea: null },
        { pro_cod: 'FAM_CERAMICA', pro_descr: 'Ceramiche', cod_famiglia: '20', cod_linea: null },
      ];
      const parsed = (service as any).parseRows(rows);
      expect(parsed.famiglie).toEqual([
        { codice: '10', nome: 'Vasi in Cotto' },
        { codice: '20', nome: 'Ceramiche' },
      ]);
      expect(parsed.linee).toEqual([]);
      expect(parsed.articoli).toEqual([]);
    });

    it('salta famiglia senza cod_famiglia', () => {
      const rows = [
        { pro_cod: 'FAM_VASI_COTTO', pro_descr: 'Vasi', cod_famiglia: null, cod_linea: null },
      ];
      expect((service as any).parseRows(rows).famiglie).toEqual([]);
    });

    it('estrae linee dalla chiave numerica cod_linea', () => {
      const rows = [
        { pro_cod: 'linea_vasi_classici', pro_descr: 'Vasi Classici', cod_famiglia: '10', cod_linea: '100' },
      ];
      const parsed = (service as any).parseRows(rows);
      expect(parsed.linee).toEqual([
        { codice: '100', nome: 'Vasi Classici', famiglia_codice: '10' },
      ]);
    });

    it('estrae articoli con famiglia e linea', () => {
      const rows = [
        { pro_cod: 'ART001', pro_descr: 'Vaso tondo cm 18', cod_famiglia: '10', cod_linea: '100', cod_diametro_esterno: '18', cod_altezza: null, incluso_b2b: true, prodotto_obsoleto: false },
      ];
      const parsed = (service as any).parseRows(rows);
      expect(parsed.articoli).toHaveLength(1);
      expect(parsed.articoli[0].pro_cod).toBe('ART001');
      expect(parsed.articoli[0].famiglia_codice).toBe('10');
      expect(parsed.articoli[0].linea_codice).toBe('100');
      expect(parsed.articoli[0].incluso_b2b).toBe(true);
      expect(parsed.articoli[0].prodotto_obsoleto).toBe(false);
    });

    it('mappa booleani da stringhe', () => {
      const rows = [
        { pro_cod: 'ART001', pro_descr: 'Test', cod_famiglia: null, cod_linea: null, incluso_b2b: 'true', prodotto_obsoleto: '1', cod_diametro_esterno: null, cod_altezza: null },
      ];
      const a = (service as any).parseRows(rows).articoli[0];
      expect(a.incluso_b2b).toBe(true);
      expect(a.prodotto_obsoleto).toBe(true);
    });

    it('salta righe senza pro_cod', () => {
      const rows = [
        { pro_cod: '', pro_descr: 'Vuoto', cod_famiglia: null, cod_linea: null },
        { pro_cod: null, pro_descr: 'Null', cod_famiglia: null, cod_linea: null },
      ];
      expect((service as any).parseRows(rows).articoli).toEqual([]);
    });

    it('gestisce codice_alternativo e codice_esterno', () => {
      const rows = [
        { pro_cod: 'ART001', pro_descr: 'Test', cod_famiglia: null, cod_linea: null, codice_alternativo: 'ALT001', codice_esterno: 'EXT001', incluso_b2b: false, prodotto_obsoleto: false, cod_diametro_esterno: null, cod_altezza: null },
      ];
      const a = (service as any).parseRows(rows).articoli[0];
      expect(a.codice_alternativo).toBe('ALT001');
      expect(a.codice_esterno).toBe('EXT001');
    });

    it('ignora righe che iniziano con FAM_ o linea_', () => {
      const rows = [
        { pro_cod: 'FAM_1', pro_descr: 'Fam1', cod_famiglia: '1', cod_linea: null },
        { pro_cod: 'linea_1', pro_descr: 'Lin1', cod_famiglia: '1', cod_linea: '1' },
        { pro_cod: 'ART', pro_descr: 'Art', cod_famiglia: null, cod_linea: null, incluso_b2b: false, prodotto_obsoleto: false, cod_diametro_esterno: null, cod_altezza: null },
      ];
      const parsed = (service as any).parseRows(rows);
      expect(parsed.famiglie).toHaveLength(1);
      expect(parsed.linee).toHaveLength(1);
      expect(parsed.articoli).toHaveLength(1);
    });
  });
});
