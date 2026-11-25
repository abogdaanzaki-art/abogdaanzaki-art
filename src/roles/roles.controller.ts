import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

class AssignRoleDto {
  @ApiProperty({ example: 'ASSISTANT' })
  @IsString()
  @IsNotEmpty()
  roleName: string;
}

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  list() {
    return this.rolesService.findAll();
  }

  @Roles('ADMIN')
  @Post('users/:userId')
  assign(@Param('userId') userId: string, @Body() dto: AssignRoleDto) {
    return this.rolesService.assignRole(parseInt(userId, 10), dto.roleName, []);
  }

  @Roles('ADMIN')
  @Delete('users/:userId/:roleName')
  remove(@Param('userId') userId: string, @Param('roleName') roleName: string) {
    return this.rolesService.removeRole(parseInt(userId, 10), roleName);
  }

  @Get('users/:userId')
  userRoles(@Param('userId') userId: string) {
    return this.rolesService.getUserRoles(parseInt(userId, 10));
  }
}
