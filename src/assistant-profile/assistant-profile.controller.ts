import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
@Controller('assistant-profiles')
export class AssistantProfileController {
  constructor(private service: AssistantProfileService) {}

  // ---- Assistant: manage own profile (auth required) ----
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ASSISTANT')
  @Post('me')
  @ApiOperation({ summary: 'Create the current assistant profile (ASSISTANT only)' })
  createMine(@CurrentUser('sub') userId: number, @Body() dto: CreateAssistantProfileDto) {
    return this.service.createMine(userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ASSISTANT')
  @Get('me')
  @ApiOperation({ summary: 'Get the current assistant profile (ASSISTANT only)' })
  findMine(@CurrentUser('sub') userId: number) {
    return this.service.findMine(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ASSISTANT')
  @Patch('me')
  @ApiOperation({ summary: 'Update the current assistant profile (ASSISTANT only)' })
  updateMine(@CurrentUser('sub') userId: number, @Body() dto: UpdateAssistantProfileDto) {
    return this.service.updateMine(userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ASSISTANT')
  @Patch('me/availability')
  @ApiOperation({ summary: 'Toggle availability (ASSISTANT only, requires APPROVED verification)' })
  updateAvailability(@CurrentUser('sub') userId: number, @Body() dto: UpdateAvailabilityDto) {
    return this.service.updateAvailability(userId, dto);
  }

  // ---- Public: available assistants (no auth required) ----
  @Get('available')
  @ApiOperation({ summary: 'List approved available assistants (public)' })
  findAvailable(@Query() q: any) {
    return this.service.findAvailable(q);
  }

  // ---- Public: view a specific assistant (no auth required) ----
  @Get(':assistantId')
  @ApiOperation({ summary: 'View a public assistant profile (public, approved only)' })
  findOnePublic(@Param('assistantId', ParseIntPipe) assistantId: number) {
    return this.service.findOnePublic(assistantId);
  }

  // ---- Admin: list all profiles (auth required) ----
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/all')
  @ApiOperation({ summary: 'List all assistant profiles (ADMIN only)' })
  findAllAdmin(@Query() q: any) {
    return this.service.findAllAdmin(q);
  }

  // ---- Admin: approve/reject (auth required) ----
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':assistantId/verification')
  @ApiOperation({ summary: 'Approve or reject an assistant profile (ADMIN only)' })
  updateVerification(
    @Param('assistantId', ParseIntPipe) assistantId: number,
    @Body() dto: UpdateVerificationDto,
  ) {
    return this.service.updateVerification(assistantId, dto);
  }
}
