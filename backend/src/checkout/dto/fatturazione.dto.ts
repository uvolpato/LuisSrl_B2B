import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

/** Dati di fatturazione confermati dal cliente al primo ordine. La P.IVA non si modifica (aggancio Integra). */
export class FatturazioneDto {
  @IsString()
  @Length(2, 200)
  ragioneSociale!: string;

  @IsOptional()
  @IsString()
  @Matches(/^([0-9]{11}|[A-Z0-9]{16})$/i, { message: 'validation.cf' })
  codiceFiscale?: string;

  @IsString()
  @Length(3, 120)
  indirizzo!: string;

  @IsString()
  @Matches(/^[0-9]{5}$/, { message: 'validation.cap' })
  cap!: string;

  @IsString()
  @Length(2, 80)
  citta!: string;

  @IsString()
  @Matches(/^[A-Za-z]{2}$/, { message: 'validation.provincia' })
  provincia!: string;

  /** Codice destinatario SDI (7 caratteri). '0000000' solo insieme alla PEC. */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{7}$/, { message: 'validation.sdi' })
  codiceSdi?: string;

  @IsOptional()
  @IsEmail({}, { message: 'validation.pec' })
  @MaxLength(200)
  pec?: string;
}
