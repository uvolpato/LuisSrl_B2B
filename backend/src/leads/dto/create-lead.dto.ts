import {
  Equals,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

/** Richiesta accesso dal sito vetrina. ValidationPipe globale: whitelist, campi extra scartati. */
export class CreateLeadDto {
  @IsString()
  @Length(2, 200)
  ragioneSociale!: string;

  /** P.IVA italiana (11 cifre) o estera (prefisso paese + 2-13 alfanumerici). */
  @IsString()
  @Matches(/^([0-9]{11}|[A-Z]{2}[0-9A-Z]{2,13})$/i, {
    message: 'validation.piva',
  })
  partitaIva!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9A-Z]{11,16}$/i, { message: 'validation.cf' })
  codiceFiscale?: string;

  @IsString()
  @Length(2, 120)
  referente!: string;

  @IsOptional()
  @IsIn(['garden', 'vivaio', 'fiorista', 'architetto', 'altro'])
  tipoAttivita?: string;

  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9 +()./-]{5,30}$/, { message: 'validation.telefono' })
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  citta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  messaggio?: string;

  @IsIn(['it', 'en'])
  lingua!: string;

  /** Consenso privacy obbligatorio: deve essere esattamente true. */
  @Equals(true)
  privacy!: boolean;

  /** Honeypot anti-spam: campo nascosto, un umano lo lascia vuoto. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sito?: string;
}
