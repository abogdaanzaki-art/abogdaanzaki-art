import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, UpdatePaymentStatusDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post()
  create(@CurrentUser('sub') userId: number, @Body() dto: CreatePaymentDto) {
    return this.paymentService.create(userId, dto);
  }

  @Get('order/:orderId')
  byOrder(
    @CurrentUser('sub') userId: number,
    @CurrentUser() user: JwtPayload,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentService.findByOrder(parseInt(orderId, 10), userId, user.roles.includes('ADMIN'));
  }

  @Get('mine')
  mine(@CurrentUser('sub') userId: number, @Query() q: any) {
    return this.paymentService.findByUser(userId, q);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePaymentStatusDto) {
    return this.paymentService.updateStatus(parseInt(id, 10), dto);
  }
}
