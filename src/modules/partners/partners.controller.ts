import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { CreatePartnerProfileDto } from './dto/create-partner-profile.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdatePartnerProfileDto } from './dto/update-partner-profile.dto';
import { PartnerProfileEntity } from './entities/partner-profile.entity';
import { PartnersService } from './partners.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Roles(UserRole.PARTNER)
  @Post('register')
  async createPartnerProfile(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() dto: CreatePartnerProfileDto,
  ): Promise<PartnerProfileEntity> {
    return this.partnersService.createPartnerProfile(currentUser.sub, dto);
  }

  @Roles(UserRole.PARTNER)
  @Get('me/dashboard')
  async getMyDashboard(@CurrentUser() currentUser: CurrentUserData) {
    return this.partnersService.getMyDashboard(currentUser.sub);
  }

  @Roles(UserRole.PARTNER)
  @Get('me')
  async getMyPartnerProfile(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<PartnerProfileEntity> {
    return this.partnersService.getPartnerProfileByUserId(currentUser.sub);
  }

  @Roles(UserRole.PARTNER)
  @Patch('me')
  async updateMyPartnerProfile(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() dto: UpdatePartnerProfileDto,
  ): Promise<PartnerProfileEntity> {
    return this.partnersService.updatePartnerProfile(currentUser.sub, dto);
  }

  @Roles(UserRole.PARTNER)
  @Patch('me/availability')
  async updateAvailability(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() dto: UpdateAvailabilityDto,
  ): Promise<PartnerProfileEntity> {
    return this.partnersService.updateAvailability(currentUser.sub, dto);
  }
}