import { PartialType } from '@nestjs/mapped-types';
import { CreateSuggestionBoxDto } from './create-suggestion-box.dto';

export class UpdateSuggestionBoxDto extends PartialType(CreateSuggestionBoxDto) {}
