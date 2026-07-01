import { IsArray, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateRaccoltaDto {
  @IsString()
  nome!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  immagine?: string;

  @IsOptional()
  @IsString()
  descrizione?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  sconto?: number;

  @IsOptional()
  @IsString()
  stato?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  articoliIds?: number[];
}
