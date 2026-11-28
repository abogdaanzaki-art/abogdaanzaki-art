import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { JwtPayload } from '../common/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'change_this_secret_in_production',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOneRaw(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException('Account inactive or not found');
    return {
      sub: user.id,
      email: user.email,
      roles: user.roles.map((ur) => ur.role.name),
    } as JwtPayload;
  }
}
