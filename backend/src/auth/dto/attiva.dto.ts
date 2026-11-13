import { IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

/** Attivazione da link monouso: il cliente sceglie la propria password. */
export class AttivaAccountDto {
  @IsString()
  @Length(20, 200)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  @Matches(/[A-Za-z]/, { message: 'validation.password_letter' })
  @Matches(/[0-9]/, { message: 'validation.password_digit' })
  password!: string;
}
