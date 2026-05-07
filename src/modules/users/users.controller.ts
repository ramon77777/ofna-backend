import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<UserEntity> {
    return this.usersService.getProfile(currentUser.sub);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserEntity> {
    return this.usersService.updateProfile(currentUser.sub, dto);
  }

  /**
   * Compatibilité avec l’existant.
   * À garder pour ne pas casser les anciennes pages qui utilisent /users/profile.
   */
  @Get('profile')
  async getProfile(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<UserEntity> {
    return this.usersService.getProfile(currentUser.sub);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserEntity> {
    return this.usersService.updateProfile(currentUser.sub, dto);
  }

  @Patch('avatar')
  async updateAvatar(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() dto: UpdateAvatarDto,
  ): Promise<UserEntity> {
    return this.usersService.updateAvatar(currentUser.sub, dto);
  }
}
