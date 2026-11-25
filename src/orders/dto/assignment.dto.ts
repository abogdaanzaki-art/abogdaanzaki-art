import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsPositive } from 'class-validator';

export class OfferAssignmentsDto {
  @ApiProperty({ type: [Number], example: [2, 3] })
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  assistantIds: number[];
}

export class UpdateAssignmentStatusDto {
  @ApiProperty({ enum: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'] })
  @IsNotEmpty()
  status: string;
}

export class UpdateOrderItemStatusDto {
  @ApiProperty({ enum: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] })
  @IsNotEmpty()
  status: string;
}
