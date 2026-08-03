import { IsArray, IsBoolean, IsIn, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export const PROMO_TIPI = ['SCONTO', 'PERCENTUALE', 'OMAGGIO', 'VETRINA'] as const;

export class CreatePromozioneDto {
  @IsString()
  titolo!: string;

  @IsIn(PROMO_TIPI)
  tipo!: (typeof PROMO_TIPI)[number];

  @IsOptional()
  @IsNumber()
  @Min(0)
  valore?: number;

  @IsISO8601()
  dataInizio!: string;

  @IsISO8601()
  dataFine!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  famiglie?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  articoli?: string[];

  @IsOptional()
  @IsInt()
  priorita?: number;

  @IsOptional()
  @IsBoolean()
  attiva?: boolean;
}
