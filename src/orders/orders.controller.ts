import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  create(@CurrentUser('sub') userId: number, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId, dto);
  }

  @Get('mine')
  mine(@CurrentUser('sub') userId: number, @Query() q: any) {
    return this.ordersService.findMine(userId, q);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('all')
  all(@Query() q: any) {
    return this.ordersService.findAllAdmin(q);
  }

  @Get(':id')
  get(@CurrentUser('sub') userId: number, @CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const isAdmin = user.roles.includes('ADMIN');
    return this.ordersService.findOne(parseInt(id, 10), userId, !isAdmin);
  }

  @Patch(':id')
  update(@CurrentUser('sub') userId: number, @Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(parseInt(id, 10), userId, dto);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser('sub') userId: number, @Param('id') id: string) {
    return this.ordersService.cancel(parseInt(id, 10), userId);
  }
}
