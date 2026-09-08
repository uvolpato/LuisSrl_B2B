import { IsIn, IsNotEmpty, IsString } from 'class-validator';

// Stati gestibili dall'admin nel portale B2B (ciclo d'ordine). Whitelist esplicita:
// mai accettare stringhe arbitrarie su un campo che guida export e reportistica.
// 'BOZZA' è l'unico stato "tecnico" forzabile: rimette l'ordine in coda export
// (e azzera il flag di esportazione, vedi AdminOrdiniService.aggiornaStato).
export const STATI_ORDINE_CONSENTITI = [
  'BOZZA',
  'attesa',
  'confermato',
  'inoltrato',
  'evaso',
  'annullato',
] as const;

export class AggiornaStatoOrdineDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(STATI_ORDINE_CONSENTITI, { message: 'admin.stato_non_consentito' })
  stato!: string;
}