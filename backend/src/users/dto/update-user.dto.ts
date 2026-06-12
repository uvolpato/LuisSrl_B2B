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
  @IsString()
  @Length(1, 200)
  ragioneSociale?: string;

  @IsOptional()
  @IsString()
  @Length(5, 20, { message: 'validation.piva' })
  partitaIva?: string;

  @IsOptional()
  @IsString()
  @Length(3, 30)
  telefono?: string;

  @IsOptional()
  @IsIn(['it', 'en'])
  preferredLanguage?: string;
}
