import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PromotionServiceItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  serviceTypeId: number;

  @ApiProperty({ example: 25 })
  @IsNumber()
  @Min(0)
  specialPrice: number;
}

export class CreatePromotionDto {
  @ApiProperty({ example: 'عرض يوم الخميس' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['MULTI_SERVICE_PERCENT', 'WEEKLY_SPECIAL_PRICE'] })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minServices?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ example: '2026-11-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-11-30T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ type: [PromotionServiceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromotionServiceItemDto)
  services?: PromotionServiceItemDto[];
}

export class UpdatePromotionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ type: [PromotionServiceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromotionServiceItemDto)
  services?: PromotionServiceItemDto[];
}
