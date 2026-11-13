import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

/** Codice TOTP (6 cifre) oppure codice di recupero (10 caratteri + trattino). */
export class MfaCodiceDto {
  @IsString()
  @Length(6, 16)
  code!: string;

  /** Se true, il browser viene certificato per 90 giorni (salta solo il secondo fattore). */
  @IsOptional()
  @IsBoolean()
  ricordaDispositivo?: boolean;
}

export class MfaPasswordDto {
  @IsString()
  @Length(1, 200)
  password!: string;
}
