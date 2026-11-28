import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

const ASSIGNABLE_ROLES = ['ASSISTANT', 'ADMIN', 'CUSTOMER'] as const;

class AssignRoleDto {
  @ApiProperty({ enum: ASSIGNABLE_ROLES, example: 'ASSISTANT' })
  @IsString()
  @IsNotEmpty()
  @IsIn(ASSIGNABLE_ROLES)
  roleName: string;
}

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Roles('ADMIN')
  @Get()
  list() {
    return this.rolesService.findAll();
  }

  @Roles('ADMIN')
  @Post('users/:userId')
  assign(@Param('userId', ParseIntPipe) userId: number, @Body() dto: AssignRoleDto) {
    return this.rolesService.assignRole(userId, dto.roleName);
  }

  @Roles('ADMIN')
  @Delete('users/:userId/:roleName')
  remove(@Param('userId', ParseIntPipe) userId: number, @Param('roleName') roleName: string) {
    return this.rolesService.removeRole(userId, roleName);
  }

  @Roles('ADMIN')
  @Get('users/:userId')
  userRoles(@Param('userId', ParseIntPipe) userId: number) {
    return this.rolesService.getUserRoles(userId);
  }
}
