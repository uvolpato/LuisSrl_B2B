export interface Tariffa {
  id: number;
  nazione: string;
  regione: string | null;
  basePercent: number;
  stato: string;
  sogliaImporto: number | null;
  minimoImporto: number | null;
  ranges: number[][];
  updatedAt: string;
}

export interface Resolved {
  t: Tariffa;
  source: string;
}

export const NAZIONI: Record<string, { n: string; z: 'EU' | 'ROW' }> = {
  AF:{n:'Afghanistan',z:'ROW'},AL:{n:'Albania',z:'ROW'},DZ:{n:'Algeria',z:'ROW'},AD:{n:'Andorra',z:'ROW'},
  AO:{n:'Angola',z:'ROW'},AI:{n:'Anguilla',z:'ROW'},AG:{n:'Antigua e Barbuda',z:'ROW'},SA:{n:'Arabia Saudita',z:'ROW'},
  AR:{n:'Argentina',z:'ROW'},AM:{n:'Armenia',z:'ROW'},AW:{n:'Aruba',z:'ROW'},AU:{n:'Australia',z:'ROW'},
  AT:{n:'Austria',z:'EU'},AX:{n:'\u00c5land',z:'ROW'},AZ:{n:'Azerbaigian',z:'ROW'},BS:{n:'Bahamas',z:'ROW'},
  BH:{n:'Bahrein',z:'ROW'},BD:{n:'Bangladesh',z:'ROW'},BB:{n:'Barbados',z:'ROW'},BE:{n:'Belgio',z:'EU'},
  BZ:{n:'Belize',z:'ROW'},BM:{n:'Bermuda',z:'ROW'},BT:{n:'Bhutan',z:'ROW'},BY:{n:'Bielorussia',z:'ROW'},
  MM:{n:'Birmania (Myanmar)',z:'ROW'},BO:{n:'Bolivia',z:'ROW'},BA:{n:'Bosnia ed Erzegovina',z:'ROW'},
  BW:{n:'Botswana',z:'ROW'},BR:{n:'Brasile',z:'ROW'},BN:{n:'Brunei',z:'ROW'},BG:{n:'Bulgaria',z:'EU'},
  BF:{n:'Burkina Faso',z:'ROW'},BI:{n:'Burundi',z:'ROW'},KH:{n:'Cambogia',z:'ROW'},CM:{n:'Camerun',z:'ROW'},
  CA:{n:'Canada',z:'ROW'},CV:{n:'Capo Verde',z:'ROW'},TD:{n:'Ciad',z:'ROW'},CL:{n:'Cile',z:'ROW'},
  CN:{n:'Cina',z:'ROW'},CY:{n:'Cipro',z:'EU'},CO:{n:'Colombia',z:'ROW'},KM:{n:'Comore',z:'ROW'},
  CG:{n:'Congo (Brazzaville)',z:'ROW'},CD:{n:'Congo (Kinshasa)',z:'ROW'},KP:{n:'Corea del Nord',z:'ROW'},
  KR:{n:'Corea del Sud',z:'ROW'},CI:{n:"Costa d'Avorio",z:'ROW'},CR:{n:'Costa Rica',z:'ROW'},
  HR:{n:'Croazia',z:'EU'},CU:{n:'Cuba',z:'ROW'},CW:{n:'Cura\u00e7ao',z:'ROW'},DK:{n:'Danimarca',z:'EU'},
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
  CK:{n:'Isole Cook',z:'ROW'},FO:{n:'Isole F\u00e6r \u00d8er',z:'ROW'},VI:{n:'Isole Vergini americane',z:'ROW'},
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
  PY:{n:'Paraguay',z:'ROW'},PE:{n:'Per\u00f9',z:'ROW'},PF:{n:'Polinesia francese',z:'ROW'},
  PL:{n:'Polonia',z:'EU'},PT:{n:'Portogallo',z:'EU'},PR:{n:'Porto Rico',z:'ROW'},QA:{n:'Qatar',z:'ROW'},
  GB:{n:'Regno Unito',z:'ROW'},CZ:{n:'Repubblica Ceca',z:'EU'},CF:{n:'Repubblica Centrafricana',z:'ROW'},
  DO:{n:'Repubblica Dominicana',z:'ROW'},RE:{n:'Riunione',z:'ROW'},RO:{n:'Romania',z:'EU'},
  RW:{n:'Ruanda',z:'ROW'},RU:{n:'Russia',z:'ROW'},WS:{n:'Samoa',z:'ROW'},SM:{n:'San Marino',z:'ROW'},
  SH:{n:"Sant'Elena",z:'ROW'},LC:{n:'Santa Lucia',z:'ROW'},ST:{n:'S\u00e3o Tom\u00e9 e Pr\u00edncipe',z:'ROW'},
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
  UZ:{n:'Uzbekistan',z:'ROW'},VU:{n:'Vanuatu',z:'ROW'},VA:{n:'Citt\u00e0 del Vaticano',z:'ROW'},
  VE:{n:'Venezuela',z:'ROW'},VN:{n:'Vietnam',z:'ROW'},WF:{n:'Wallis e Futuna',z:'ROW'},
  YE:{n:'Yemen',z:'ROW'},ZM:{n:'Zambia',z:'ROW'},ZW:{n:'Zimbabwe',z:'ROW'},
};

export const NAZIONI_ORDER = Object.keys(NAZIONI).sort((a, b) => NAZIONI[a].n.localeCompare(NAZIONI[b].n, 'it'));

export const REGIONI_IT = [
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli-Venezia Giulia',
  'Lazio','Liguria','Lombardia','Marche','Molise','Piemonte','Puglia','Sardegna',
  'Sicilia','Toscana','Trentino-Alto Adige','Umbria',"Valle d'Aosta",'Veneto',
];

export const ZONE_KEYS: Record<string, string> = { EUROPA: 'Europa', ROW: 'Resto del mondo' };
const ZONE_ORDER = ['EUROPA', 'ROW'];

export function isZona(n: string) { return n === 'EUROPA' || n === 'ROW'; }
function zonaOf(n: string) { return NAZIONI[n]?.z === 'EU' ? 'EUROPA' : 'ROW'; }
export function euCount() { return Object.values(NAZIONI).filter(n => n.z === 'EU').length; }

export function destName(d: Tariffa): string {
  if (isZona(d.nazione)) return ZONE_KEYS[d.nazione];
  return d.regione !== null ? d.regione + ' (' + d.nazione + ')' : (NAZIONI[d.nazione] ? NAZIONI[d.nazione].n : d.nazione);
}

export function destTitle(d: Tariffa): string {
  if (d.regione !== null) return 'Tariffa regione \u2014 ' + destName(d);
  if (isZona(d.nazione)) return 'Tariffa ' + destName(d);
  return 'Tariffa nazione \u2014 ' + destName(d);
}

export function destLevel(d: Tariffa): string {
  if (d.regione !== null) return 'Regione';
  if (d.nazione === 'EUROPA') return 'Area';
  if (d.nazione === 'ROW') return 'Default';
  return 'Nazione';
}

export function describeTariffa(d: Tariffa) {
  if (d.regione !== null) {
    return {
      hier: 'regione',
      title: destName(d),
      text: 'Eccezione di livello regionale: vale per le consegne in questa regione italiana e prevale sulla tariffa della nazione e delle aree.',
    };
  }
  if (isZona(d.nazione)) {
    if (d.nazione === 'EUROPA') {
      return {
        hier: 'europa',
        title: 'Europa',
        text: 'Tariffa d\u2019area: vale per i ' + euCount() + ' paesi dell\u2019area europea senza una tariffa di nazione o regione.',
      };
    }
    return {
      hier: 'row',
      title: 'Resto del mondo',
      text: 'Default globale: vale per tutti i paesi del mondo senza una tariffa pi\u00f9 specifica. Resta sempre attivo in mancanza di altre tariffe.',
    };
  }
  return {
    hier: 'nazione',
    title: destName(d),
    text: 'Tariffa di riferimento per ' + (NAZIONI[d.nazione] ? NAZIONI[d.nazione].n : d.nazione) + ': vale per tutti gli indirizzi del paese, salvo le eccezioni regionali configurate.',
  };
}

export function resolveTariffa(all: Tariffa[], nazione: string, regione: string | null): { t: Tariffa; source: string } | null {
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

export function pctOf(ranges: number[][], base: number, discount: number) {
  for (const rng of ranges) {
    if (discount >= rng[0] && (rng[1] === null || discount < rng[1])) {
      return { pct: rng[2], rng };
    }
  }
  return { pct: base, rng: null };
}

export function calcFee(t: Tariffa, amount: number, discount: number) {
  const base = t.basePercent;
  const ranges = t.ranges ?? [];
  const soglia = t.sogliaImporto;
  const minimo = t.minimoImporto;
  const { pct, rng } = pctOf(ranges, base, discount);
  const superaSoglia = soglia !== null && soglia > 0 && amount >= soglia;
  let fee = superaSoglia ? 0 : (amount * pct) / 100;
  if (!superaSoglia && minimo !== null && fee < minimo) fee = minimo;
  return { pct, rng, soglia, minimo, superaSoglia, fee };
}

export function currentRanges(ranges: number[][]): number[][] {
  return ranges.map((r, i) => {
    if (i === 0) return [0, r[1], r[2]];
    const prev = ranges[i - 1];
    return [prev[1] ?? 0, r[1], r[2]];
  });
}

export function sortedDest(list: Tariffa[]): Tariffa[] {
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

export function fmtEur(n: number): string {
  return '\u20ac ' + n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtPct(n: number): string {
  return (String(n).replace('.', ',') + (Number.isInteger(n) ? ',0' : '')) + '%';
}

export const statoLabel: Record<string, string> = { ok: 'Configurata', pausa: 'In pausa', configura: 'Da configurare' };
