import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PermissionOverrideDto {
  @IsString()
  @IsNotEmpty()
  permission!: string;

  @IsBoolean()
  granted!: boolean;
}

export class UpdateUserPermissionsDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionOverrideDto)
  overrides?: PermissionOverrideDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removeOverrides?: string[];
}
