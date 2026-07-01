import { PartialType } from '@nestjs/mapped-types';
import { CreateRaccoltaDto } from './create-raccolta.dto';

export class UpdateRaccoltaDto extends PartialType(CreateRaccoltaDto) {}
