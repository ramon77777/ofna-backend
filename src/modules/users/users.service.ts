import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';

import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async findById(userId: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getProfile(userId: string): Promise<UserEntity> {
    return this.findById(userId);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserEntity> {
    const user = await this.findById(userId);

    if (dto.phone) {
      const existingUserWithPhone = await this.usersRepository.findOne({
        where: {
          phone: dto.phone,
          id: Not(userId),
        },
      });

      if (existingUserWithPhone) {
        throw new ConflictException('Phone number is already in use');
      }
    }

    if (dto.email) {
      const normalizedEmail = dto.email.trim().toLowerCase();

      const existingUserWithEmail = await this.usersRepository.findOne({
        where: {
          email: normalizedEmail,
          id: Not(userId),
        },
      });

      if (existingUserWithEmail) {
        throw new ConflictException('Email is already in use');
      }

      user.email = normalizedEmail;
    }

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName.trim();
    }

    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName.trim();
    }

    if (dto.phone !== undefined) {
      user.phone = dto.phone.trim();
    }

    await this.usersRepository.save(user);

    return this.findById(userId);
  }

  async updateAvatar(
    userId: string,
    dto: UpdateAvatarDto,
  ): Promise<UserEntity> {
    const user = await this.findById(userId);

    user.profilePhotoUrl =
      dto.profilePhotoUrl === undefined ? user.profilePhotoUrl : dto.profilePhotoUrl;

    await this.usersRepository.save(user);

    return this.findById(userId);
  }
}