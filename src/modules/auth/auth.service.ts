import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { AccountStatus } from '../../common/enums/account-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { LoginDto } from './dto/login.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginResponse } from './interfaces/login-response.interface';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  private async signToken(user: UserEntity): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      phone: user.phone,
      email: user.email,
    });
  }

  async registerClient(dto: RegisterClientDto): Promise<LoginResponse> {
    const normalizedPhone = dto.phone.trim();
    const normalizedEmail = dto.email?.trim().toLowerCase() ?? null;

    const existingUserByPhone = await this.usersRepository.findOne({
      where: { phone: normalizedPhone },
    });

    if (existingUserByPhone) {
      throw new ConflictException('Phone number is already in use');
    }

    if (normalizedEmail) {
      const existingUserByEmail = await this.usersRepository.findOne({
        where: { email: normalizedEmail },
      });

      if (existingUserByEmail) {
        throw new ConflictException('Email is already in use');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepository.create({
      role: UserRole.CLIENT,
      firstName: dto.firstName?.trim() ?? null,
      lastName: dto.lastName?.trim() ?? null,
      phone: normalizedPhone,
      email: normalizedEmail,
      passwordHash,
      profilePhotoUrl: null,
      accountStatus: AccountStatus.ACTIVE,
      lastLoginAt: null,
    });

    await this.usersRepository.save(user);

    const freshUser = await this.usersRepository.findOneOrFail({
      where: { id: user.id },
    });

    const accessToken = await this.signToken(freshUser);

    return {
      accessToken,
      user: freshUser,
    };
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const normalizedPhone = dto.phone?.trim();
    const normalizedEmail = dto.email?.trim().toLowerCase();

    if (!normalizedPhone && !normalizedEmail) {
      throw new UnauthorizedException('Phone or email is required');
    }

    const user = await this.usersRepository.findOne({
      where: normalizedPhone
        ? { phone: normalizedPhone }
        : { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await this.usersRepository.save(user);

    const accessToken = await this.signToken(user);

    return {
      accessToken,
      user,
    };
  }

  async me(userId: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return user;
  }
}