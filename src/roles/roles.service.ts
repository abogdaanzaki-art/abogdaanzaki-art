import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private roles: Repository<Role>,
    @InjectRepository(UserRole) private userRoles: Repository<UserRole>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  findAll() {
    return this.roles.find();
  }

  async findByName(name: string) {
    const role = await this.roles.findOne({ where: { name } });
    if (!role) throw new NotFoundException(`Role ${name} not found`);
    return role;
  }

  async assignRole(userId: number, roleName: string) {
    const role = await this.findByName(roleName);
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.userRoles.findOne({ where: { userId, roleId: role.id } });
    if (existing) return existing;

    return this.userRoles.save({ userId, roleId: role.id });
  }

  async removeRole(userId: number, roleName: string) {
    const role = await this.findByName(roleName);
    await this.userRoles.delete({ userId, roleId: role.id });
    return { removed: true };
  }

  async getUserRoles(userId: number) {
    const urs = await this.userRoles.find({ where: { userId }, relations: ['role'] });
    return urs.map((ur) => ur.role);
  }
}
