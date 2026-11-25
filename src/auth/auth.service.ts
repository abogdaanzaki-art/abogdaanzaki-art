import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { UserRole } from '../roles/entities/user-role.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtPayload } from '../common/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Role) private roles: Repository<Role>,
    @InjectRepository(UserRole) private userRoles: Repository<UserRole>,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hash = await bcrypt.hash(dto.password, 10);
    const user = this.users.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      passwordHash: hash,
      isActive: true,
      roles: [],
    });
    await this.users.save(user);

    // Assign default CUSTOMER role; never allow self-assignment of ASSISTANT/ADMIN.
    const customerRole = await this.roles.findOne({ where: { name: 'CUSTOMER' } });
    if (customerRole) {
      await this.userRoles.save({
        userId: user.id,
        roleId: customerRole.id,
      });
    }
    return this.buildAuthResponse(user.id, user.email, ['CUSTOMER']);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({
      where: { email: dto.email },
      relations: ['roles', 'roles.role'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account inactive');
    return this.buildAuthResponse(user.id, user.email, user.roles.map((ur) => ur.role.name));
  }

  private buildAuthResponse(userId: number, email: string, roles: string[]) {
    const payload: JwtPayload = { sub: userId, email, roles };
    const token = this.jwt.sign(payload);
    return { accessToken: token, user: { id: userId, email, roles } };
  }
}
