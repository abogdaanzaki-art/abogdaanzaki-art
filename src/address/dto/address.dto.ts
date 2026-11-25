import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'شارع الملك فهد، حي العليا' })
  @IsString()
  @IsNotEmpty()
  addressLine: string;

  @ApiProperty({ example: 'الرياض' })
  @IsString()
  @IsNotEmpty()
  city: string;
}

export class UpdateAddressDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  addressLine?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  city?: string;
}
