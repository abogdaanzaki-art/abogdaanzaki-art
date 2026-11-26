import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AssistantProfileService } from './assistant-profile.service';
import {
  CreateAssistantProfileDto,
  UpdateAssistantProfileDto,
  UpdateAvailabilityDto,
  UpdateVerificationDto,
} from './dto/assistant-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';

@ApiTags('AssistantProfiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assistant-profiles')
export class AssistantProfileController {
  constructor(private service: AssistantProfileService) {}

  // Static routes first to avoid :assistantId collision.
  @Roles('ASSISTANT')
  @Post('me')
  createMine(@CurrentUser('sub') userId: number, @Body() dto: CreateAssistantProfileDto) {
    return this.service.createMine(userId, dto);
  }

  @Roles('ASSISTANT')
  @Get('me')
  findMine(@CurrentUser('sub') userId: number) {
    return this.service.findMine(userId);
  }

  @Roles('ASSISTANT')
  @Patch('me')
  updateMine(@CurrentUser('sub') userId: number, @Body() dto: UpdateAssistantProfileDto) {
    return this.service.updateMine(userId, dto);
  }

  @Roles('ASSISTANT')
  @Patch('me/availability')
  updateAvailability(@CurrentUser('sub') userId: number, @Body() dto: UpdateAvailabilityDto) {
    return this.service.updateAvailability(userId, dto);
  }

  @Get('available')
  findAvailable(@Query() q: any) {
    return this.service.findAvailable(q);
  }

  @Roles('ADMIN')
  @Get('admin/all')
  findAllAdmin(@Query() q: any) {
    return this.service.findAllAdmin(q);
  }

  @Get(':assistantId')
  findOnePublic(@Param('assistantId') assistantId: string) {
    return this.service.findOnePublic(parseInt(assistantId, 10));
  }

  @Roles('ADMIN')
  @Patch(':assistantId/verification')
  updateVerification(
    @Param('assistantId') assistantId: string,
    @Body() dto: UpdateVerificationDto,
  ) {
    return this.service.updateVerification(parseInt(assistantId, 10), dto);
  }
}
