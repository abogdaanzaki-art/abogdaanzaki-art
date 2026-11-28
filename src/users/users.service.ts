import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { toSafeUser, toSafeUserArray } from '../common/safe-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private users: Repository<User>) {}

  async findByIdWithRoles(id: number) {
    const user = await this.users.findOne({
      where: { id },
      relations: ['roles', 'roles.role'],
    });
    if (!user) throw new NotFoundException('User not found');
    return toSafeUser(user);
  }

  async findAll(skip = 0, take = 20, filter?: { q?: string }) {
    const qb = this.users.createQueryBuilder('u').leftJoinAndSelect('u.roles', 'ur').leftJoinAndSelect('ur.role', 'r');
    if (filter?.q) {
      qb.andWhere('(u.email LIKE :q OR u.fullName LIKE :q OR u.phone LIKE :q)', { q: `%${filter.q}%` });
    }
    const [data, total] = await qb.skip(skip).take(take).getManyAndCount();
    return { data: toSafeUserArray(data), total };
  }

  async findOne(id: number) {
    const user = await this.users.findOne({ where: { id }, relations: ['roles', 'roles.role'] });
    if (!user) throw new NotFoundException('User not found');
    return toSafeUser(user);
  }

  async setActive(id: number, isActive: boolean) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.isActive = isActive;
    await this.users.save(user);
    return toSafeUser({ ...user, roles: [] });
  }

  async findOneRaw(id: number) {
    const user = await this.users.findOne({ where: { id }, relations: ['roles', 'roles.role'] });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
