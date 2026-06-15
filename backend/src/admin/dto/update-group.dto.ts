import { IsArray, IsOptional, IsString, ArrayMinSize } from 'class-validator';

export class UpdateGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @IsOptional()
  permissions?: string[];
}
