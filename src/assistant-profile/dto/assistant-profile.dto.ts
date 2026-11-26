import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateAssistantProfileDto {
  @ApiPropertyOptional({ example: 'سائق محترف بخبرة 5 سنوات في التوصيل' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiPropertyOptional({ example: 'https://cdn.mashwari.com/avatar/12.jpg' })
  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @ApiProperty({ example: 'الرياض' })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ type: [Number], example: [1, 2], description: 'IDs of service types the assistant can perform' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  serviceTypeIds?: number[];
}

export class UpdateAssistantProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ type: [Number], description: 'Replace the assistant service types' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  serviceTypeIds?: number[];
}

export class UpdateAvailabilityDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isAvailable: boolean;
}

export class UpdateVerificationDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsString()
  verificationStatus: 'APPROVED' | 'REJECTED';
}
