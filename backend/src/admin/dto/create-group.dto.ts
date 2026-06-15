import { IsArray, IsNotEmpty, IsString, ArrayMinSize } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  permissions!: string[];
}
