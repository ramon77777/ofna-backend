import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { CurrentUserData } from '../../../common/interfaces/current-user.interface';
import { UserRole } from '../../../common/enums/user-role.enum';

interface JwtPayload {
  sub: string;
  role: UserRole;
  phone: string;
  email: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('jwt.secret') || 'change_this_secret',
    });
  }

  validate(payload: JwtPayload): CurrentUserData {
    return {
      sub: payload.sub,
      role: payload.role,
      phone: payload.phone,
      email: payload.email,
    };
  }
}
