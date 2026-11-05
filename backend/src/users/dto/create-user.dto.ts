import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'validation.email' })
  email!: string;

  @IsString()
  @Length(1, 200, { message: 'validation.required' })
  nome!: string;

  @IsOptional()
  @IsIn(['SUPERUSER', 'AMMINISTRATORE', 'UTENTE'])
  ruolo?: string;

  @IsOptional()
  @IsIn(['it', 'en'])
  preferredLanguage?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  groupId?: number;
}
