import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional, IsString } from 'class-validator';

// I decoratori sono obbligatori: il ValidationPipe globale ha whitelist:true e
// scarta in silenzio i campi non decorati.
class CreateFamigliaDto {
  @IsOptional() @IsString() nomePortale?: string;
  @IsOptional() @IsString() descrizione?: string;
  @IsOptional() @IsString() immagine?: string;
  @IsOptional() @IsIn(['ATTIVO', 'NASCOSTO']) stato?: string;
}

export class UpdateFamigliaDto extends PartialType(CreateFamigliaDto) {}
