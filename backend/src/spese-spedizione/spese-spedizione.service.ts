import { Injectable, BadRequestException, ConflictException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { TariffaSpedizione } from '@prisma/client';

const NAZIONI: Record<string, { n: string; z: 'EU' | 'ROW' }> = {
  AF:{n:'Afghanistan',z:'ROW'},AL:{n:'Albania',z:'ROW'},DZ:{n:'Algeria',z:'ROW'},AD:{n:'Andorra',z:'ROW'},
  AO:{n:'Angola',z:'ROW'},AI:{n:'Anguilla',z:'ROW'},AG:{n:'Antigua e Barbuda',z:'ROW'},SA:{n:'Arabia Saudita',z:'ROW'},
  AR:{n:'Argentina',z:'ROW'},AM:{n:'Armenia',z:'ROW'},AW:{n:'Aruba',z:'ROW'},AU:{n:'Australia',z:'ROW'},
  AT:{n:'Austria',z:'EU'},AX:{n:'Åland',z:'ROW'},AZ:{n:'Azerbaigian',z:'ROW'},BS:{n:'Bahamas',z:'ROW'},
  BH:{n:'Bahrein',z:'ROW'},BD:{n:'Bangladesh',z:'ROW'},BB:{n:'Barbados',z:'ROW'},BE:{n:'Belgio',z:'EU'},
  BZ:{n:'Belize',z:'ROW'},BM:{n:'Bermuda',z:'ROW'},BT:{n:'Bhutan',z:'ROW'},BY:{n:'Bielorussia',z:'ROW'},
  MM:{n:'Birmania (Myanmar)',z:'ROW'},BO:{n:'Bolivia',z:'ROW'},BA:{n:'Bosnia ed Erzegovina',z:'ROW'},
  BW:{n:'Botswana',z:'ROW'},BR:{n:'Brasile',z:'ROW'},BN:{n:'Brunei',z:'ROW'},BG:{n:'Bulgaria',z:'EU'},
  BF:{n:'Burkina Faso',z:'ROW'},BI:{n:'Burundi',z:'ROW'},KH:{n:'Cambogia',z:'ROW'},CM:{n:'Camerun',z:'ROW'},
  CA:{n:'Canada',z:'ROW'},CV:{n:'Capo Verde',z:'ROW'},TD:{n:'Ciad',z:'ROW'},CL:{n:'Cile',z:'ROW'},
  CN:{n:'Cina',z:'ROW'},CY:{n:'Cipro',z:'EU'},CO:{n:'Colombia',z:'ROW'},KM:{n:'Comore',z:'ROW'},
  CG:{n:'Congo (Brazzaville)',z:'ROW'},CD:{n:'Congo (Kinshasa)',z:'ROW'},KP:{n:'Corea del Nord',z:'ROW'},
  KR:{n:'Corea del Sud',z:'ROW'},CI:{n:"Costa d'Avorio",z:'ROW'},CR:{n:'Costa Rica',z:'ROW'},
  HR:{n:'Croazia',z:'EU'},CU:{n:'Cuba',z:'ROW'},CW:{n:'Curaçao',z:'ROW'},DK:{n:'Danimarca',z:'EU'},
  DM:{n:'Dominica',z:'ROW'},EC:{n:'Ecuador',z:'ROW'},EG:{n:'Egitto',z:'ROW'},SV:{n:'El Salvador',z:'ROW'},
  AE:{n:'Emirati Arabi Uniti',z:'ROW'},ER:{n:'Eritrea',z:'ROW'},EE:{n:'Estonia',z:'EU'},
  SZ:{n:'eSwatini',z:'ROW'},ET:{n:'Etiopia',z:'ROW'},FJ:{n:'Figi',z:'ROW'},PH:{n:'Filippine',z:'ROW'},
  FI:{n:'Finlandia',z:'EU'},FK:{n:'Falkland (Isole)',z:'ROW'},FR:{n:'Francia',z:'EU'},GA:{n:'Gabon',z:'ROW'},
  GM:{n:'Gambia',z:'ROW'},GE:{n:'Georgia',z:'ROW'},DE:{n:'Germania',z:'EU'},GH:{n:'Ghana',z:'ROW'},
  JM:{n:'Giamaica',z:'ROW'},JP:{n:'Giappone',z:'ROW'},GI:{n:'Gibilterra',z:'ROW'},JO:{n:'Giordania',z:'ROW'},
  GR:{n:'Grecia',z:'EU'},GD:{n:'Grenada',z:'ROW'},GL:{n:'Groenlandia',z:'ROW'},GP:{n:'Guadalupa',z:'ROW'},
  GU:{n:'Guam',z:'ROW'},GT:{n:'Guatemala',z:'ROW'},GG:{n:'Guernsey',z:'ROW'},GN:{n:'Guinea',z:'ROW'},
  GQ:{n:'Guinea Equatoriale',z:'ROW'},GW:{n:'Guinea-Bissau',z:'ROW'},GY:{n:'Guyana',z:'ROW'},
  GF:{n:'Guiana francese',z:'ROW'},HT:{n:'Haiti',z:'ROW'},HN:{n:'Honduras',z:'ROW'},
  HK:{n:'Hong Kong',z:'ROW'},IN:{n:'India',z:'ROW'},ID:{n:'Indonesia',z:'ROW'},IR:{n:'Iran',z:'ROW'},
  IQ:{n:'Iraq',z:'ROW'},IE:{n:'Irlanda',z:'EU'},IS:{n:'Islanda',z:'ROW'},IM:{n:'Isola di Man',z:'ROW'},
  MH:{n:'Isole Marshall',z:'ROW'},SB:{n:'Isole Salomone',z:'ROW'},KY:{n:'Isole Cayman',z:'ROW'},
  CK:{n:'Isole Cook',z:'ROW'},FO:{n:'Isole Fær Øer',z:'ROW'},VI:{n:'Isole Vergini americane',z:'ROW'},
  VG:{n:'Isole Vergini britanniche',z:'ROW'},IL:{n:'Israele',z:'ROW'},IT:{n:'Italia',z:'EU'},
  JE:{n:'Jersey',z:'ROW'},KZ:{n:'Kazakistan',z:'ROW'},KE:{n:'Kenya',z:'ROW'},KG:{n:'Kirghizistan',z:'ROW'},
  KI:{n:'Kiribati',z:'ROW'},XK:{n:'Kosovo',z:'ROW'},KW:{n:'Kuwait',z:'ROW'},LA:{n:'Laos',z:'ROW'},
  LS:{n:'Lesotho',z:'ROW'},LV:{n:'Lettonia',z:'EU'},LB:{n:'Libano',z:'ROW'},LR:{n:'Liberia',z:'ROW'},
  LY:{n:'Libia',z:'ROW'},LI:{n:'Liechtenstein',z:'ROW'},LT:{n:'Lituania',z:'EU'},LU:{n:'Lussemburgo',z:'EU'},
  MO:{n:'Macao',z:'ROW'},MK:{n:'Macedonia del Nord',z:'ROW'},MG:{n:'Madagascar',z:'ROW'},
  MW:{n:'Malawi',z:'ROW'},MY:{n:'Malaysia',z:'ROW'},MV:{n:'Maldive',z:'ROW'},ML:{n:'Mali',z:'ROW'},
  MT:{n:'Malta',z:'EU'},MA:{n:'Marocco',z:'ROW'},MQ:{n:'Martinica',z:'ROW'},MR:{n:'Mauritania',z:'ROW'},
  MU:{n:'Mauritius',z:'ROW'},YT:{n:'Mayotte',z:'ROW'},MX:{n:'Messico',z:'ROW'},FM:{n:'Micronesia',z:'ROW'},
  MD:{n:'Moldavia',z:'ROW'},MN:{n:'Mongolia',z:'ROW'},ME:{n:'Montenegro',z:'ROW'},MS:{n:'Montserrat',z:'ROW'},
  MZ:{n:'Mozambico',z:'ROW'},NA:{n:'Namibia',z:'ROW'},NR:{n:'Nauru',z:'ROW'},NP:{n:'Nepal',z:'ROW'},
  NI:{n:'Nicaragua',z:'ROW'},NE:{n:'Niger',z:'ROW'},NG:{n:'Nigeria',z:'ROW'},NU:{n:'Niue',z:'ROW'},
  NO:{n:'Norvegia',z:'ROW'},NC:{n:'Nuova Caledonia',z:'ROW'},NZ:{n:'Nuova Zelanda',z:'ROW'},
  OM:{n:'Oman',z:'ROW'},NL:{n:'Paesi Bassi',z:'EU'},PK:{n:'Pakistan',z:'ROW'},PW:{n:'Palau',z:'ROW'},
  PS:{n:'Palestina',z:'ROW'},PA:{n:'Panama',z:'ROW'},PG:{n:'Papua Nuova Guinea',z:'ROW'},
  PY:{n:'Paraguay',z:'ROW'},PE:{n:'Perù',z:'ROW'},PF:{n:'Polinesia francese',z:'ROW'},
  PL:{n:'Polonia',z:'EU'},PT:{n:'Portogallo',z:'EU'},PR:{n:'Porto Rico',z:'ROW'},QA:{n:'Qatar',z:'ROW'},
  GB:{n:'Regno Unito',z:'ROW'},CZ:{n:'Repubblica Ceca',z:'EU'},CF:{n:'Repubblica Centrafricana',z:'ROW'},
  DO:{n:'Repubblica Dominicana',z:'ROW'},RE:{n:'Riunione',z:'ROW'},RO:{n:'Romania',z:'EU'},
  RW:{n:'Ruanda',z:'ROW'},RU:{n:'Russia',z:'ROW'},WS:{n:'Samoa',z:'ROW'},SM:{n:'San Marino',z:'ROW'},
  SH:{n:"Sant'Elena",z:'ROW'},LC:{n:'Santa Lucia',z:'ROW'},ST:{n:'São Tomé e Príncipe',z:'ROW'},
  KN:{n:'Saint Kitts e Nevis',z:'ROW'},PM:{n:'Saint-Pierre e Miquelon',z:'ROW'},
  VC:{n:'Saint Vincent e Grenadine',z:'ROW'},SN:{n:'Senegal',z:'ROW'},RS:{n:'Serbia',z:'ROW'},
  SC:{n:'Seychelles',z:'ROW'},SL:{n:'Sierra Leone',z:'ROW'},SG:{n:'Singapore',z:'ROW'},
  SY:{n:'Siria',z:'ROW'},SK:{n:'Slovacchia',z:'EU'},SI:{n:'Slovenia',z:'EU'},SO:{n:'Somalia',z:'ROW'},
  ES:{n:'Spagna',z:'EU'},LK:{n:'Sri Lanka',z:'ROW'},US:{n:'Stati Uniti',z:'ROW'},
  ZA:{n:'Sudafrica',z:'ROW'},SD:{n:'Sudan',z:'ROW'},SS:{n:'Sudan del Sud',z:'ROW'},
  SR:{n:'Suriname',z:'ROW'},SE:{n:'Svezia',z:'EU'},CH:{n:'Svizzera',z:'ROW'},
  SX:{n:'Sint Maarten',z:'ROW'},TJ:{n:'Tagikistan',z:'ROW'},TW:{n:'Taiwan',z:'ROW'},
  TZ:{n:'Tanzania',z:'ROW'},TH:{n:'Thailandia',z:'ROW'},TL:{n:'Timor Est',z:'ROW'},TG:{n:'Togo',z:'ROW'},
  TO:{n:'Tonga',z:'ROW'},TT:{n:'Trinidad e Tobago',z:'ROW'},TC:{n:'Turks e Caicos',z:'ROW'},
  TN:{n:'Tunisia',z:'ROW'},TR:{n:'Turchia',z:'ROW'},TM:{n:'Turkmenistan',z:'ROW'},TV:{n:'Tuvalu',z:'ROW'},
  UA:{n:'Ucraina',z:'ROW'},UG:{n:'Uganda',z:'ROW'},HU:{n:'Ungheria',z:'EU'},UY:{n:'Uruguay',z:'ROW'},
  UZ:{n:'Uzbekistan',z:'ROW'},VU:{n:'Vanuatu',z:'ROW'},VA:{n:'Città del Vaticano',z:'ROW'},
  VE:{n:'Venezuela',z:'ROW'},VN:{n:'Vietnam',z:'ROW'},WF:{n:'Wallis e Futuna',z:'ROW'},
  YE:{n:'Yemen',z:'ROW'},ZM:{n:'Zambia',z:'ROW'},ZW:{n:'Zimbabwe',z:'ROW'},
};

const NAZIONI_ORDER = Object.keys(NAZIONI).sort((a, b) => NAZIONI[a].n.localeCompare(NAZIONI[b].n, 'it'));

const REGIONI_IT = [
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli-Venezia Giulia',
  'Lazio','Liguria','Lombardia','Marche','Molise','Piemonte','Puglia','Sardegna',
  'Sicilia','Toscana','Trentino-Alto Adige','Umbria',"Valle d'Aosta",'Veneto',
];

const ZONE_KEYS: Record<string, string> = { EUROPA: 'Europa', ROW: 'Resto del mondo' };
const ZONE_ORDER = ['EUROPA', 'ROW'];
function isZona(n: string) { return n === 'EUROPA' || n === 'ROW'; }
function zonaOf(n: string) { return NAZIONI[n]?.z === 'EU' ? 'EUROPA' : 'ROW'; }
function euCount() { return Object.values(NAZIONI).filter(n => n.z === 'EU').length; }

type Row = TariffaSpedizione;
type Resolved = { t: Row; source: string } | null;

@Injectable()
export class SpeseSpedizioneService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Row[]> {
    const all = await this.prisma.tariffaSpedizione.findMany();
    return this.sortedDest(all);
  }

  async findById(id: number): Promise<Row | null> {
    return this.prisma.tariffaSpedizione.findUnique({ where: { id } });
  }

  async create(data: { nazione: string; regione?: string; basePercent: number; stato: string; sogliaImporto?: number; minimoImporto?: number; minimoOrdine?: number; ranges?: number[][] }): Promise<Row> {
    if (data.regione && data.nazione !== 'IT') throw new BadRequestException('Regione richiede nazione IT');
    if (isZona(data.nazione) && data.regione) throw new BadRequestException('Le aree non hanno regione');
    const existing = await this.prisma.tariffaSpedizione.findFirst({
      where: { nazione: data.nazione, regione: data.regione ?? null },
    });
    if (existing) throw new ConflictException('Destinazione già esistente');
    try {
      return await this.prisma.tariffaSpedizione.create({
      data: {
        nazione: data.nazione,
        regione: data.regione ?? null,
        basePercent: data.basePercent,
        stato: data.stato,
        sogliaImporto: data.sogliaImporto ?? null,
        minimoImporto: data.minimoImporto ?? null,
        minimoOrdine: data.minimoOrdine ?? null,
        ranges: data.ranges ?? [],
      },
    });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('Destinazione già esistente');
      throw e;
    }
  }

  async update(id: number, data: { basePercent?: number; stato?: string; sogliaImporto?: number; minimoImporto?: number; minimoOrdine?: number; ranges?: number[][] }): Promise<Row> {
    const t = await this.findById(id);
    if (!t) throw new NotFoundException('Tariffa non trovata');
    return this.prisma.tariffaSpedizione.update({
      where: { id },
      data: {
        ...(data.basePercent !== undefined ? { basePercent: data.basePercent } : {}),
        ...(data.stato !== undefined ? { stato: data.stato } : {}),
        ...(data.sogliaImporto !== undefined ? { sogliaImporto: data.sogliaImporto } : {}),
        ...(data.minimoImporto !== undefined ? { minimoImporto: data.minimoImporto } : {}),
        ...(data.minimoOrdine !== undefined ? { minimoOrdine: data.minimoOrdine } : {}),
        ...(data.ranges !== undefined ? { ranges: data.ranges } : {}),
      },
    });
  }

  async toggleStato(id: number): Promise<Row> {
    const t = await this.findById(id);
    if (!t) throw new NotFoundException('Tariffa non trovata');
    if (t.stato === 'configura') throw new BadRequestException('Una tariffa da configurare non può essere messa in pausa');
    const nuovo = t.stato === 'ok' ? 'pausa' : 'ok';
    return this.prisma.tariffaSpedizione.update({ where: { id }, data: { stato: nuovo } });
  }

  async delete(id: number): Promise<void> {
    const t = await this.findById(id);
    if (!t) throw new NotFoundException('Tariffa non trovata');
    if (t.nazione === 'ROW') throw new BadRequestException('La tariffa Resto del mondo non può essere eliminata');
    await this.prisma.tariffaSpedizione.delete({ where: { id } });
  }

  async risolvi(nazione: string, regione?: string, importo?: number, sconto?: number) {
    const resolved = await this.resolveTariffaAsync(nazione, regione ?? null);
    const calc = resolved ? Calcola(resolved.t, importo ?? 0, sconto ?? 0) : null;
    return {
      tariffa: resolved ? this.serialize(resolved.t) : null,
      source: resolved?.source ?? null,
      calcolo: calc,
    };
  }

  // ── Logica dominio ──

  async resolveTariffaAsync(nazione: string, regione: string | null): Promise<Resolved> {
    const all = await this.prisma.tariffaSpedizione.findMany();
    return this.resolveTariffaFromList(all, nazione, regione);
  }

  resolveTariffaFromList(all: Row[], nazione: string, regione: string | null): Resolved {
    const find = (n: string, r: string | null) => all.find(d => d.nazione === n && (d.regione ?? null) === r) ?? null;

    if (regione !== null && !isZona(nazione)) {
      const reg = find(nazione, regione);
      if (reg && reg.stato === 'ok') return { t: reg, source: 'regione' };
    }
    const naz = find(nazione, null);
    if (naz && naz.stato === 'ok') return { t: naz, source: 'nazione' };
    if (isZona(nazione)) return null;
    const zona = zonaOf(nazione);
    const zon = find(zona, null);
    if (zon && zon.stato === 'ok') return { t: zon, source: zona === 'EUROPA' ? 'europa' : 'row' };
    if (zona === 'EUROPA') {
      const row = find('ROW', null);
      if (row && row.stato === 'ok') return { t: row, source: 'row' };
    }
    return null;
  }

  resolveTariffa(nazione: string, regione: string | null): Resolved {
    return this.resolveTariffaFromList(this._tariffeCache, nazione, regione);
  }

  private findByDest(nazione: string, regione: string | null) {
    return this.prisma.tariffaSpedizione.findFirst({
      where: { nazione, regione: regione ?? null },
    });
  }

  private _tariffeCache: Row[] = [];

  async loadCache() {
    this._tariffeCache = await this.prisma.tariffaSpedizione.findMany();
  }

  onModuleInit() {
    this.loadCache();
  }

  serialize(t: Row) {
    return {
      id: t.id,
      nazione: t.nazione,
      regione: t.regione,
      basePercent: Number(t.basePercent),
      stato: t.stato,
      sogliaImporto: t.sogliaImporto ? Number(t.sogliaImporto) : null,
      minimoImporto: t.minimoImporto ? Number(t.minimoImporto) : null,
      minimoOrdine: t.minimoOrdine ? Number(t.minimoOrdine) : null,
      ranges: (t.ranges as number[][]) ?? [],
      updatedAt: t.updatedAt,
    };
  }

  private sortedDest(list: Row[]) {
    return list.slice().sort((a, b) => {
      const za = isZona(a.nazione) ? 0 : 1;
      const zb = isZona(b.nazione) ? 0 : 1;
      if (za !== zb) return za - zb;
      if (za === 0) return ZONE_ORDER.indexOf(a.nazione) - ZONE_ORDER.indexOf(b.nazione);
      const ia = NAZIONI_ORDER.indexOf(a.nazione);
      const ib = NAZIONI_ORDER.indexOf(b.nazione);
      if (ia !== ib) return ia - ib;
      if (a.regione === null && b.regione !== null) return -1;
      if (a.regione !== null && b.regione === null) return 1;
      if (a.regione === null && b.regione === null) return 0;
      return (a.regione ?? '').localeCompare(b.regione ?? '', 'it');
    });
  }

  getNazioni() { return NAZIONI; }
  getNazioniOrder() { return NAZIONI_ORDER; }
  getRegioniIT() { return REGIONI_IT; }
  getEuCount() { return euCount(); }
  getZoneKeys() { return ZONE_KEYS; }
  isZona(n: string) { return isZona(n); }
}

// ── Calcolo (puro, esportabile) ──

export function PctOf(ranges: number[][], base: number, discount: number) {
  for (const rng of ranges) {
    if (discount >= rng[0] && (rng[1] === null || discount < rng[1])) {
      return { pct: rng[2], rng };
    }
  }
  return { pct: base, rng: null };
}

export function Calcola(t: Row, amount: number, discount: number) {
  const base = Number(t.basePercent);
  const ranges = (t.ranges as number[][]) ?? [];
  const soglia = t.sogliaImporto ? Number(t.sogliaImporto) : null;
  const minimo = t.minimoImporto ? Number(t.minimoImporto) : null;
  const minimoOrdine = t.minimoOrdine ? Number(t.minimoOrdine) : null;
  const { pct, rng } = PctOf(ranges, base, discount);
  const superaSoglia = soglia !== null && soglia > 0 && amount >= soglia;
  let fee = superaSoglia ? 0 : amount * pct / 100;
  if (!superaSoglia && minimo !== null && fee < minimo) fee = minimo;
  return { pct, rng, soglia, minimo, minimoOrdine, superaSoglia, fee };
}
