import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  add(@CurrentUser('sub') userId: number, @Param('assistantId') assistantId: string) {
    return this.service.add(userId, parseInt(assistantId, 10));
  }

  @Roles('CUSTOMER')
  @Get()
  list(@CurrentUser('sub') userId: number, @Query() q: any) {
    return this.service.list(userId, q);
  }

  @Roles('CUSTOMER')
  @Delete(':assistantId')
  remove(@CurrentUser('sub') userId: number, @Param('assistantId') assistantId: string) {
    return this.service.remove(userId, parseInt(assistantId, 10));
  }
}
