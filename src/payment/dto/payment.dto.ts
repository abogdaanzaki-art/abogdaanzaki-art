import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsPositive()
  orderId: number;

  @ApiProperty({ enum: ['CASH', 'CARD'], default: 'CASH' })
  @IsEnum(['CASH', 'CARD'])
  method: 'CASH' | 'CARD';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionRef?: string;
}

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: ['PAID', 'FAILED', 'REFUNDED'] })
  @IsEnum(['PAID', 'FAILED', 'REFUNDED'])
  status: 'PAID' | 'FAILED' | 'REFUNDED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionRef?: string;
}
