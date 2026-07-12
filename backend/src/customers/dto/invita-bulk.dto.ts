import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

export class InvitaBulkDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  customerIds!: number[];
}
