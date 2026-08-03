import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSuggestionBoxDto {
  @IsString()
  titolo!: string;

  @IsOptional()
  @IsString()
  prompt?: string;

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
