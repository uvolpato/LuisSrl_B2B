import {
  IsIn,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  nome?: string;

  @IsOptional()
  @IsIn(['SUPERUSER', 'AMMINISTRATORE', 'UTENTE', 'SOSPESO'])
  ruolo?: string;

  @IsOptional()
  @IsIn(['it', 'en'])
  preferredLanguage?: string;
}
