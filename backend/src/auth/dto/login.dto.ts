import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'validation.email' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'validation.required' })
  @MaxLength(200)
  password!: string;

  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}
