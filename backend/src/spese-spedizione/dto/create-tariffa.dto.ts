import { IsString, IsOptional, IsNumber, IsArray, IsIn, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTariffaDto {
  @IsString()
  @IsNotEmpty()
  nazione: string;

  @IsOptional()
  @IsString()
  regione?: string;

  @IsNumber()
  @Type(() => Number)
  basePercent: number;

  @IsString()
  @IsIn(['ok', 'pausa', 'configura'])
  stato: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sogliaImporto?: number;

  @IsOptional()
  @IsArray()
  ranges?: number[][];
}
