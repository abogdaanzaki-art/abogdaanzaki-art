import { Controller, Delete, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('favorites/assistants')
export class FavoritesController {
  constructor(private service: FavoritesService) {}

  @Roles('CUSTOMER')
  @Post(':assistantId')
  @ApiOperation({ summary: 'Add an assistant to favorites (CUSTOMER only)' })
  add(@CurrentUser('sub') userId: number, @Param('assistantId', ParseIntPipe) assistantId: number) {
    return this.service.add(userId, assistantId);
  }

  @Roles('CUSTOMER')
  @Get()
  @ApiOperation({ summary: 'List the current customer favorites (CUSTOMER only)' })
  list(@CurrentUser('sub') userId: number, @Query() q: any) {
    return this.service.list(userId, q);
  }

  @Roles('CUSTOMER')
  @Delete(':assistantId')
  @ApiOperation({ summary: 'Remove an assistant from favorites (CUSTOMER only)' })
  remove(@CurrentUser('sub') userId: number, @Param('assistantId', ParseIntPipe) assistantId: number) {
    return this.service.remove(userId, assistantId);
  }
}
