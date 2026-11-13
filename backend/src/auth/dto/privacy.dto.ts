import { IsBoolean, IsString, MaxLength } from 'class-validator';

/** Presa visione dell'informativa del portale (non è un consenso: base contrattuale). */
export class PrivacyAccettaDto {
  @IsString()
  @MaxLength(20)
  versione!: string;
}

/** Opposizione al tracciamento comportamentale (art. 21 GDPR). */
export class TrackingOptOutDto {
  @IsBoolean()
  optOut!: boolean;
}
