import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/** Aggiornamento del proprio profilo (tab Account). Tutti i campi opzionali;
 *  bio/genere/data nascita possono essere svuotati (null). */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nome?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  bio?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(['uomo', 'donna', 'altro', 'non-specificato'])
  gender?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsISO8601()
  birthDate?: string | null;
}
