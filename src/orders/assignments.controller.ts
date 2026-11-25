import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import {
  OfferAssignmentsDto,
  UpdateAssignmentStatusDto,
  UpdateOrderItemStatusDto,
} from './dto/assignment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/current-user.decorator';

@ApiTags('OrderItems & Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  // ---- Offers (admin or customer who owns the order) ----
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CUSTOMER')
  @Post('order-items/:id/offers')
  offer(@Param('id') id: string, @Body() dto: OfferAssignmentsDto) {
    return this.assignmentsService.offer(parseInt(id, 10), dto);
  }

  // ---- Assistant: my offers ----
  @Get('assistant/offers')
  myOffers(@CurrentUser('sub') userId: number, @Query() q: any) {
    return this.assignmentsService.myOffers(userId, q);
  }

  // ---- Assistant: my accepted tasks ----
  @Get('assistant/tasks')
  myTasks(@CurrentUser('sub') userId: number, @Query() q: any) {
    return this.assignmentsService.myTasks(userId, q);
  }

  // ---- Assistant: respond to an offer ----
  @Patch('assignments/:id/respond')
  respond(
    @CurrentUser('sub') userId: number,
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentStatusDto,
  ) {
    return this.assignmentsService.respond(parseInt(id, 10), userId, dto);
  }

  // ---- Assistant: update item execution status ----
  @Patch('order-items/:id/status')
  updateItemStatus(
    @CurrentUser('sub') userId: number,
    @Param('id') id: string,
    @Body() dto: UpdateOrderItemStatusDto,
  ) {
    return this.assignmentsService.updateItemStatus(parseInt(id, 10), userId, dto);
  }
}
