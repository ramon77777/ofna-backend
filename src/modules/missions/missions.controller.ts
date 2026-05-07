import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { MissionStatusHistoryEntity } from '../mission-status-history/entities/mission-status-history.entity';
import { MissionStatusHistoryService } from '../mission-status-history/mission-status-history.service';
import { AcceptMissionDto } from './dto/accept-mission.dto';
import { CancelMissionDto } from './dto/cancel-mission.dto';
import { CreateMissionDto } from './dto/create-mission.dto';
import { ProposeMissionPriceDto } from './dto/propose-mission-price.dto';
import { UpdateMissionStatusDto } from './dto/update-mission-status.dto';
import { ValidateMissionPriceDto } from './dto/validate-mission-price.dto';
import { MissionEntity } from './entities/mission.entity';
import { MissionsService } from './missions.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('missions')
export class MissionsController {
  constructor(
    private readonly missionsService: MissionsService,
    private readonly missionStatusHistoryService: MissionStatusHistoryService,
  ) {}

  @Roles(UserRole.CLIENT)
  @Post()
  async createMission(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() dto: CreateMissionDto,
  ): Promise<MissionEntity> {
    return this.missionsService.createMission(currentUser.sub, dto);
  }

  @Roles(UserRole.CLIENT)
  @Get('client/me')
  async getClientMissions(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<MissionEntity[]> {
    return this.missionsService.getClientMissions(currentUser.sub);
  }

  @Roles(UserRole.PARTNER)
  @Get('partner/me')
  async getPartnerMissions(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<MissionEntity[]> {
    return this.missionsService.getPartnerMissions(currentUser.sub);
  }

  @Roles(UserRole.PARTNER)
  @Get('partner/me/:missionId')
  async getPartnerMissionById(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('missionId') missionId: string,
  ): Promise<MissionEntity> {
    return this.missionsService.getPartnerMissionById(
      currentUser.sub,
      missionId,
    );
  }

  @Roles(UserRole.CLIENT, UserRole.PARTNER, UserRole.ADMIN)
  @Get(':missionId/history')
  async getMissionHistory(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('missionId') missionId: string,
  ): Promise<MissionStatusHistoryEntity[]> {
    return this.missionStatusHistoryService.getMissionHistoryForUser(
      currentUser,
      missionId,
    );
  }

  @Roles(UserRole.PARTNER)
  @Patch(':missionId/accept')
  async acceptMission(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('missionId') missionId: string,
    @Body() dto: AcceptMissionDto,
  ): Promise<MissionEntity> {
    return this.missionsService.acceptMission(currentUser.sub, missionId, dto);
  }

  @Roles(UserRole.PARTNER)
  @Patch(':missionId/propose-price')
  async proposePrice(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('missionId') missionId: string,
    @Body() dto: ProposeMissionPriceDto,
  ): Promise<MissionEntity> {
    return this.missionsService.proposePrice(currentUser.sub, missionId, dto);
  }

  @Roles(UserRole.CLIENT)
  @Patch(':missionId/validate-price')
  async validatePrice(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('missionId') missionId: string,
    @Body() dto: ValidateMissionPriceDto,
  ): Promise<MissionEntity> {
    return this.missionsService.validatePrice(currentUser.sub, missionId, dto);
  }

  @Roles(UserRole.PARTNER)
  @Patch(':missionId/status')
  async updateMissionStatus(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('missionId') missionId: string,
    @Body() dto: UpdateMissionStatusDto,
  ): Promise<MissionEntity> {
    return this.missionsService.updateMissionStatus(
      currentUser.sub,
      missionId,
      dto,
    );
  }

  @Roles(UserRole.CLIENT)
  @Patch(':missionId/cancel')
  async cancelMission(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('missionId') missionId: string,
    @Body() dto: CancelMissionDto,
  ): Promise<MissionEntity> {
    return this.missionsService.cancelMission(currentUser.sub, missionId, dto);
  }

  @Roles(UserRole.CLIENT, UserRole.PARTNER, UserRole.ADMIN)
  @Get(':missionId')
  async getMissionById(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('missionId') missionId: string,
  ): Promise<MissionEntity> {
    return this.missionsService.getMissionByIdForUser(currentUser, missionId);
  }
}
