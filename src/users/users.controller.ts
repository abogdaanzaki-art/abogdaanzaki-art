import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { paginate, paginated } from '../common/pagination';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles('ADMIN')
  @Get()
  async list(@Query() q: { page?: string; limit?: string; q?: string }) {
    const { skip, take, page, limit } = paginate(q);
    const res = await this.usersService.findAll(skip, take, { q: q.q });
    return paginated(res.data, res.total, page, limit);
  }

  @Roles('ADMIN')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.usersService.findOne(parseInt(id, 10));
  }

  @Roles('ADMIN')
  @Patch(':id/active')
  toggleActive(@Param('id') id: string, @Query('active') active: string) {
    return this.usersService.setActive(parseInt(id, 10), active !== 'false');
  }
}
