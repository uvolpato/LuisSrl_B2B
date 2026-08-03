import { PartialType } from '@nestjs/mapped-types';
import { CreatePromozioneDto } from './create-promozione.dto';

export class UpdatePromozioneDto extends PartialType(CreatePromozioneDto) {}
