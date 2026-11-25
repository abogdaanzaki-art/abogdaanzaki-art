import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/current-user.decorator';

@ApiTags('Address')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressController {
  constructor(private service: AddressService) {}

  @Post()
  create(@CurrentUser('sub') userId: number, @Body() dto: CreateAddressDto) {
    return this.service.create(userId, dto);
  }

  @Get()
  list(@CurrentUser('sub') userId: number) {
    return this.service.findByUser(userId);
  }

  @Get(':id')
  get(@CurrentUser('sub') userId: number, @Param('id') id: string) {
    return this.service.findOneOwned(parseInt(id, 10), userId);
  }

  @Patch(':id')
  update(@CurrentUser('sub') userId: number, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.service.update(parseInt(id, 10), userId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('sub') userId: number, @Param('id') id: string) {
    return this.service.remove(parseInt(id, 10), userId);
  }
}
