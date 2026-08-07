import { IsString, IsOptional, IsNumber, IsArray, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTariffaDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  basePercent?: number;

  @IsOptional()
  @IsString()
  @IsIn(['ok', 'pausa', 'configura'])
  stato?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sogliaImporto?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minimoImporto?: number;

  @IsOptional()
  @IsArray()
  ranges?: number[][];
}
