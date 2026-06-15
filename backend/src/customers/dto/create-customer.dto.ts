import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateCustomerDto {
  @IsEmail({}, { message: 'validation.email' })
  email!: string;

  @IsString()
  @Length(1, 200, { message: 'validation.required' })
  nome!: string;

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
  @IsString()
  @Length(1, 10)
  preferredLanguage?: string;
}
