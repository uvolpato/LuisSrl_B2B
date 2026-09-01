import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSuggestionBoxDto {
  @IsString()
  titolo!: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  /** Testo semantico separato dal prompt (generato dal planner). Se vuoto usa prompt. */
  @IsOptional()
  @IsString()
  ricercaTesto?: string;

  /** cliente = sui dati del cliente; generale = sui dati di vendita globali. */
  @IsOptional()
  @IsIn(['cliente', 'generale'])
  ambito?: 'cliente' | 'generale';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  nArticoli?: number;

  /** {acquisti, tracking, progetti, affinita} — normalizzati lato engine. */
  @IsOptional()
  @IsObject()
  pesi?: Record<string, number>;

  @IsOptional()
  @IsBoolean()
  soloInOfferta?: boolean;

  @IsOptional()
  @IsBoolean()
  escludiAcquistati?: boolean;

  @IsOptional()
  @IsString()
  scopeFamiglia?: string;

  @IsOptional()
  @IsString()
  scopeRaccolta?: string;

  @IsOptional()
  @IsBoolean()
  attiva?: boolean;

  @IsOptional()
  @IsInt()
  ordinamento?: number;
}
