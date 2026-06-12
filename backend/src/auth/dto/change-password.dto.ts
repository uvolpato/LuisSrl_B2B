import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'validation.required' })
  oldPassword!: string;

  @IsString()
  @MinLength(8, { message: 'validation.password_min' })
  @MaxLength(200)
  @Matches(/[A-Za-z]/, { message: 'validation.password_letter' })
  @Matches(/[0-9]/, { message: 'validation.password_digit' })
  newPassword!: string;
}
